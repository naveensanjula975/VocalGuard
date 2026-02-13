import React from "react";

// ─── Reusable sub-components for ProfilePage (memoized) ───

/**
 * Small card showing one statistic (title, value, icon).
 */
export const StatCard = React.memo(({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div className="text-2xl">{icon}</div>
        </div>
    </div>
));
StatCard.displayName = "StatCard";

/**
 * Consistent text input used across the profile form.
 */
export const ProfileField = React.memo(({
    label,
    type = "text",
    name,
    value,
    onChange,
    disabled,
    placeholder,
    colSpan,
}) => {
    const inputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${disabled ? "bg-gray-50 border-gray-200" : "border-gray-300"
        }`;

    return (
        <div className={colSpan ? "md:col-span-2" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                className={inputClasses}
            />
        </div>
    );
});
ProfileField.displayName = "ProfileField";

/**
 * Toggle switch used in the preferences panel.
 */
export const ToggleSwitch = React.memo(({ name, label, description, checked, onChange }) => (
    <div className="flex items-center justify-between">
        <div>
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
        </label>
    </div>
));
ToggleSwitch.displayName = "ToggleSwitch";

/**
 * Select dropdown used in preferences panel.
 */
export const SelectField = React.memo(({ label, name, value, onChange, options }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
        </label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
));
SelectField.displayName = "SelectField";

/**
 * Warning/info banner with icon, title, and body text.
 */
export const AlertBanner = React.memo(({
    variant = "yellow",
    icon,
    title,
    children,
}) => {
    const colorMap = {
        yellow: {
            bg: "bg-yellow-50",
            border: "border-yellow-200",
            iconColor: "text-yellow-400",
            titleColor: "text-yellow-800",
            bodyColor: "text-yellow-700",
        },
        red: {
            bg: "bg-red-50",
            border: "border-red-200",
            iconColor: "text-red-400",
            titleColor: "text-red-800",
            bodyColor: "text-red-700",
        },
        blue: {
            bg: "bg-blue-50",
            border: "border-blue-200",
            iconColor: "text-blue-400",
            titleColor: "text-blue-800",
            bodyColor: "text-blue-700",
        },
    };
    const c = colorMap[variant] || colorMap.yellow;

    return (
        <div className={`${c.bg} border ${c.border} rounded-md p-4`}>
            <div className="flex">
                {icon && (
                    <div className={`flex-shrink-0 ${c.iconColor}`}>{icon}</div>
                )}
                <div className="ml-3">
                    <h3 className={`text-sm font-medium ${c.titleColor}`}>{title}</h3>
                    <div className={`mt-1 text-sm ${c.bodyColor}`}>{children}</div>
                </div>
            </div>
        </div>
    );
});
AlertBanner.displayName = "AlertBanner";
