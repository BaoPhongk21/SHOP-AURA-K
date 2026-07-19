import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { API_BASE_URL } from '../config/api.config';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);

    const fetchSettings = useCallback(async () => {
        try {
            // Thêm timestamp để tránh cache
            const timestamp = Date.now();
            const res = await fetch(`${API_BASE_URL}/api/v1/settings?t=${timestamp}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            const result = await res.json();
            if (result.success) {
                let data = result.data || {};
                let normalizedData = {
                    name: data.name || data.store_name || 'AURA.K',
                    hotline: data.hotline || '',
                    address: data.address || '',
                    shippingFee: data.shipping_fee ?? data.shippingFee ?? 0,
                    mapUrl: data.map_url || data.mapUrl || '',
                    primaryColor: data.primary_color || data.primaryColor || '#003178',
                    paymentVcbQr: data.payment_vcb_qr || data.paymentVcbQr || '',
                    paymentMomoQr: data.payment_momo_qr || data.paymentMomoQr || '',
                    paymentVcbActive: data.payment_vcb_active == 1 || data.payment_vcb_active === true || data.paymentVcbActive === true,
                    paymentMomoActive: data.payment_momo_active == 1 || data.payment_momo_active === true || data.paymentMomoActive === true,
                    paymentCodActive: data.payment_cod_active == 1 || data.payment_cod_active === true || data.paymentCodActive === true,
                    shippingGhtkActive: data.shipping_ghtk_active !== 0 && data.shipping_ghtk_active !== false && data.shippingGhtkActive !== false,
                    shippingGhnActive: data.shipping_ghn_active == 1 || data.shipping_ghn_active === true || data.shippingGhnActive === true
                };
                setSettings(normalizedData);
            }
        } catch (err) {
            console.error("❌ Lỗi khi tải cấu hình hệ thống:", err);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettings = async (newData) => {
        // Nếu newData có dữ liệu, cập nhật state ngay lập tức
        if (newData && Object.keys(newData).length > 0) {
            setSettings(prev => ({ ...prev, ...newData }));
        }

        // Chỉ fetch lại nếu không có data truyền vào hoặc sau 1s để đồng bộ DB
        setTimeout(() => {
            fetchSettings();
        }, 1000);
    };

    return (
        <SettingsContext.Provider value={{ settings, fetchSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};