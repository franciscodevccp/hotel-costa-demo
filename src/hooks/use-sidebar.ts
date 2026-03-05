"use client";

import { useState, useEffect } from "react";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export function useSidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Cargar preferencia del localStorage
        const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        if (stored !== null) {
            setIsCollapsed(stored === "true");
        }
        setIsLoaded(true);
    }, []);

    const toggle = () => {
        setIsCollapsed((prev) => {
            const newValue = !prev;
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue));
            return newValue;
        });
    };

    return { isCollapsed, toggle, isLoaded };
}
