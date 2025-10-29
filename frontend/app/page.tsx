"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, User, ShoppingBag, DollarSign, Edit, Trash2, ArrowDownCircle, LucideIcon, X, Users, Database } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type NotificationType = 'success' | 'error' | 'info';

interface NotificationState {
    message: string;
    type: NotificationType;
    notificationKey: number; 
}

interface CustomerData {
    id: string; 
    name: string;
    totalPoints: number; 
    customerId?: any; 
}

interface StatusResponseData {
    message: string;
    customerId: string; 
    newTotalPoints: number; 
}

interface PointsByTimeData {
    customerId: string; 
    startDate: string; 
    endDate: string; 
    pointsEarned: number; 
}


// --- Configuration ---
const API_BASE_URL = 'http://localhost:8080/api';

// --- Core API Interaction Service (UPDATED WITH ROBUST ERROR HANDLING) ---
const apiService = {
    fetchData: async (path: string, method: string = 'GET', body: object | null = null): Promise<any> => {
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${API_BASE_URL}${path}`, options); 
            
            if (method === 'DELETE' && response.status === 204) {
                return { success: true, message: 'Resource deleted successfully.' };
            }

            let data: any;
            try {
                data = await response.json();
            } catch (e) {
                if (response.status === 204) return {};
                throw new Error(`Server returned non-JSON response (Status ${response.status}).`);
            }

            if (!response.ok) {
                // FINAL FIX: Extract the most specific message from the Java error payload
                const status = response.status;
                const specificError = data.detail || data.message || data.error; 
                
                const errorMessage = specificError 
                    ? specificError // Use the specific server message ("Insufficient points...")
                    : `API Request Failed with status ${status}.`; // Fallback generic message

                throw new Error(errorMessage);
            }
            
            // Data mapping for consistency
            if (Array.isArray(data)) {
                return data.map(item => ({
                    ...item,
                    id: item.id || item.customerId, 
                    totalPoints: item.totalPoints, 
                }));
            }
            // Ensure single object returns camelCase keys for consistency
            return {
                ...data,
                id: data.id || data.customerId,
                totalPoints: data.totalPoints
            };
            
        } catch (error: unknown) {
            console.error("API Error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Network or connectivity error. Check your Spring Boot server.';
            throw new Error(errorMessage);
        }
    },
    
    validateAndParseNumeric: (value: string): number => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }
};

// --- UTILITY FUNCTION FOR DATE RANGES ---
const getPastDate = (monthsAgo: number): string => {
    const today = new Date();
    // Calculate the date N months ago
    const pastDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, today.getDate());
    
    // Fix for edge cases where going back a month lands on the wrong date
    if (pastDate.getMonth() !== (today.getMonth() - monthsAgo + 12) % 12) {
        pastDate.setDate(0); 
    }
    
    // Function to ensure single-digit numbers have a leading zero
    const pad = (num: number) => (num < 10 ? '0' : '') + num;

    // Format the date as YYYY-MM-DD for the API
    const year = pastDate.getFullYear();
    const month = pad(pastDate.getMonth() + 1); // getMonth() is 0-indexed
    const day = pad(pastDate.getDate());

    return `${year}-${month}-${day}`;
};

const getTodayDate = (): string => {
    const today = new Date();
    const pad = (num: number) => (num < 10 ? '0' : '') + num;
    const year = today.getFullYear();
    const month = pad(today.getMonth() + 1);
    const day = pad(today.getDate());

    return `${year}-${month}-${day}`;
};
// ------------------------------------------

// --- Shared Components ---
const Notification: React.FC<{ message: string, type: NotificationType, onClose: () => void, notificationKey: number }> = ({ message, type, onClose, notificationKey }) => {
    if (!message) return null;
    const colorClasses: Record<NotificationType, string> = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700',
    };
    return (
        <div key={notificationKey} className={`fixed bottom-4 right-4 p-4 border rounded-lg shadow-xl z-50 ${colorClasses[type]} transition-all duration-300 transform`}>
            <div className="flex justify-between items-center">
                <span>{message}</span>
                <button onClick={onClose} className={`ml-4 font-bold ${type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                    &times;
                </button>
            </div>
        </div>
    );
};

interface CardProps {
    title: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-100 ${className}`}>
        <div className="flex items-center space-x-3 mb-4 border-b pb-3 text-indigo-600">
            {Icon && <Icon className="w-6 h-6" />}
            <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        {children}
    </div>
);

interface ButtonProps {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled: boolean;
    type?: 'submit' | 'reset' | 'button'; 
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, disabled, type = 'submit', className = '' }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-2 px-4 rounded-lg font-medium shadow-md transition-all duration-200 
            ${disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white transform hover:scale-[1.01] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/50'
            } ${className}`}
    >
        {children}
    </button>
);

interface InputProps {
    label: string;
    id: string;
    type?: 'text' | 'number' | 'password' | 'date';
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    placeholder: string;
    required?: boolean;
    className?: string;
    disabled?: boolean; 
}

const Input: React.FC<InputProps> = ({ label, id, type = 'text', value, onChange, placeholder, required = false, className = '', disabled = false }) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled} 
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
        />
    </div>
);


// --- Customer Detail Modal (Unchanged) ---

interface CustomerDetailModalProps {
    customer: CustomerData;
    onClose: () => void;
    onUpdate: (id: string, name: string) => Promise<void>;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose, onUpdate }) => {
    const [name, setName] = useState(customer.name);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onUpdate(customer.id, name);
        setLoading(false);
        onClose(); 
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <Card title={`Manage Customer: ${customer.id}`} icon={Edit} className="w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-700 font-medium">Current Points: <span className="text-2xl font-bold">{customer.totalPoints}</span></p>
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Customer ID"
                        id="id"
                        value={customer.id}
                        onChange={() => {}} 
                        placeholder=""
                        className="bg-gray-100 cursor-not-allowed"
                        disabled={true} 
                    />
                    <Input
                        label="Customer Name"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter new name"
                        required
                    />
                    <Button disabled={loading || name.trim() === customer.name.trim()}>
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}

// --- Customer List (Updated) ---
const CustomerList: React.FC<{ setNotification: (n: NotificationState) => void }> = ({ setNotification }) => {
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<CustomerData | null>(null);


    const fetchAllCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const data: CustomerData[] = await apiService.fetchData('/customers/all');
            
            setCustomers(data); 

            setNotification({ 
                message: `Successfully loaded ${data.length} customers.`, 
                type: 'info', 
                notificationKey: Date.now() 
            });
            
        } catch (err) {
            const errorMessage = (err as Error).message;
            setError(errorMessage);
            setCustomers([]);
            setNotification({ 
                message: errorMessage, 
                type: 'error', 
                notificationKey: Date.now() 
            });
        } finally {
            setLoading(false);
        }
    }, [setNotification]); 
    
    useEffect(() => {
        fetchAllCustomers();
    }, [fetchAllCustomers]); 

    const handleUpdate = async (id: string, name: string) => {
        try {
            await apiService.fetchData(`/customers/${id}`, 'PUT', { name: name }); 
            setNotification({ message: `Customer ${id} updated successfully.`, type: 'success', notificationKey: Date.now() });
            fetchAllCustomers(); // Refresh list
        } catch (error) {
            setNotification({ message: `Update failed: ${(error as Error).message}`, type: 'error', notificationKey: Date.now() });
        }
    };

    const handleDelete = async (customer: CustomerData) => {
        setShowDeleteConfirm(null); // Close modal first
        setLoading(true);
        try {
            await apiService.fetchData(`/customers/${customer.id}`, 'DELETE');
            setNotification({ message: `Customer ${customer.id} successfully deleted.`, type: 'success', notificationKey: Date.now() });
            fetchAllCustomers(); // Refresh list
        } catch (error) {
            setNotification({ message: `Deletion failed: ${(error as Error).message}`, type: 'error', notificationKey: Date.now() });
            setLoading(false);
        }
    };

    return (
        <Card title="All Registered Customers" icon={Users} className="max-w-full">
            <div className="flex justify-end mb-4">
                <button
                    onClick={fetchAllCustomers}
                    disabled={loading}
                    className="flex items-center space-x-2 py-2 px-4 text-sm font-medium rounded-lg text-indigo-700 border border-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Refreshing...' : 'Refresh List'}</span>
                </button>
            </div>

            {error && <p className="p-3 bg-red-100 text-red-700 rounded-lg mb-4">{error}</p>}
            
            {loading && (
                <div className="p-4 bg-gray-50 text-gray-700 rounded-lg text-center">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin"/>
                    Fetching customer data...
                </div>
            )}

            {!loading && !error && customers.length === 0 && (
                <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-center">
                    <Database className="w-6 h-6 mx-auto mb-2"/>
                    No customers found in the database.
                </div>
            )}

            {customers.length > 0 && (
                <div className="overflow-x-auto border rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Customer ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Name</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Total Points</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {customers.map((customer, i) => {
                                return (
                                    <tr key={customer.id || i} className="hover:bg-indigo-50/50 transition-colors">
                                        
                                        {/* CUSTOMER ID CELL */}
                                        <td className="px-6 py-4 whitespace-nowrap w-1/5">
                                            <span 
                                                className="text-base font-medium" 
                                                style={{ color: '#312E81', fontFamily: 'monospace' }} 
                                            >
                                                {customer.id}
                                            </span>
                                        </td>
                                        
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-2/5">{customer.name}</td>
                                        
                                        {/* TOTAL POINTS CELL */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-lg font-bold text-indigo-700 w-1/5">
                                            {customer.totalPoints} 
                                        </td>
                                        
                                        {/* ACTIONS CELL */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-1/5">
                                            <div className="flex justify-end space-x-2">
                                                <button 
                                                    onClick={() => setSelectedCustomer(customer)}
                                                    className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-100 transition"
                                                    title="View/Edit Details"
                                                >
                                                    <Edit className="w-5 h-5"/>
                                                </button>
                                                <button 
                                                    onClick={() => setShowDeleteConfirm(customer)}
                                                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition"
                                                    title="Delete Customer"
                                                >
                                                    <Trash2 className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL 1: View/Update Details */}
            {selectedCustomer && (
                <CustomerDetailModal 
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onUpdate={handleUpdate}
                />
            )}

            {/* MODAL 2: Delete Confirmation Popup */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <Card title={`Confirm Deletion`} icon={Trash2} className="w-full max-w-sm relative !border-red-400">
                        <p className="text-gray-700 mb-6">Are you sure you want to permanently delete **{showDeleteConfirm.name}** ({showDeleteConfirm.id})? This action cannot be undone.</p>
                        <div className="flex space-x-3">
                            <Button 
                                type="button" 
                                onClick={() => setShowDeleteConfirm(null)} 
                                className="!bg-gray-400 hover:!bg-gray-500" 
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="button" 
                                onClick={() => handleDelete(showDeleteConfirm)} 
                                className="!bg-red-600 hover:!bg-red-700" 
                                disabled={loading}
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Delete'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </Card>
    );
};


// ------------------------------------------------------------------------------------------------

// --- Register Customer (Unchanged) ---

const RegisterCustomer: React.FC<{ setNotification: (n: NotificationState) => void }> = ({ setNotification }) => {
    // FIX: Changed state keys to camelCase
    const [form, setForm] = useState<{ customerId: string, name: string, initialPoints: number }>({ customerId: '', name: '', initialPoints: 0 });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        // FIX: Map input IDs to camelCase state names
        const newId = id === 'customer_id' ? 'customerId' : id === 'initial_points' ? 'initialPoints' : id;

        setForm(prev => ({ 
            ...prev, 
            [newId]: newId === 'initialPoints' ? apiService.validateAndParseNumeric(value) : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // FIX: Send camelCase fields to Java API
            const data: CustomerData = await apiService.fetchData('/customers/register', 'POST', {
                customerId: form.customerId,
                name: form.name,
                initialPoints: Math.round(form.initialPoints),
            });
            // FIX: Read id property which is mapped from customerId
            setNotification({ message: `Customer ${data.name} registered successfully with ID: ${data.id}.`, type: 'success', notificationKey: Date.now() });
            // FIX: Reset form using camelCase keys
            setForm({ customerId: '', name: '', initialPoints: 0 }); 
        } catch (error) {
            setNotification({ message: (error as Error).message || 'Registration failed.', type: 'error', notificationKey: Date.now() });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Register New Customer" icon={User}>
            <p className="text-gray-500 mb-6">Create a new loyalty account. Use unique IDs like 'CUST-003'.</p>
            <form onSubmit={handleSubmit}>
                <Input
                    label="Customer ID (e.g., CUST-003)"
                    id="customer_id" // Input ID remains snake_case
                    value={form.customerId} // Value reads from camelCase state
                    onChange={handleChange}
                    required
                    placeholder="Unique Customer ID"
                />
                <Input
                    label="Customer Name"
                    id="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Jane Doe"
                />
                <Input
                    label="Initial Points (Optional)"
                    id="initial_points" // Input ID remains snake_case
                    type="number"
                    value={form.initialPoints === 0 ? '' : form.initialPoints} // Value reads from camelCase state
                    onChange={handleChange}
                    placeholder="0"
                />
                <Button disabled={loading}>
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Register Customer'}
                </Button>
            </form>
        </Card>
    );
};

// --- Earn Points (Unchanged) ---
const EarnPoints: React.FC<{ setNotification: (n: NotificationState) => void }> = ({ setNotification }) => {
    // FIX: Changed state keys to camelCase
    const [form, setForm] = useState({ customerId: '', amount: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        const newId = id === 'customer_id' ? 'customerId' : id;

        setForm(prev => ({ ...prev, [newId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const purchaseAmount = apiService.validateAndParseNumeric(form.amount);
            
            if (purchaseAmount <= 0) {
                throw new Error("Purchase amount must be greater than zero.");
            }

            // FIX: Send camelCase fields to Java API
            const data: StatusResponseData = await apiService.fetchData('/transactions/purchase', 'POST', {
                customerId: form.customerId,
                amount: purchaseAmount,
            });
            setNotification({ message: data.message, type: 'success', notificationKey: Date.now() });
            setForm({ customerId: form.customerId, amount: '' });
        } catch (error) {
            setNotification({ message: (error as Error).message || 'Purchase transaction failed.', type: 'error', notificationKey: Date.now() });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Record Purchase & Earn Points" icon={ShoppingBag}>
            <p className="text-gray-500 mb-6">Earn 1 point for every full ₹50 spent.</p>
            <form onSubmit={handleSubmit}>
                <Input
                    label="Customer ID"
                    id="customer_id"
                    value={form.customerId}
                    onChange={handleChange}
                    required
                    placeholder="e.g., CUST-001"
                />
                <Input
                    label="Purchase Amount (₹)"
                    id="amount"
                    type="number"
                    value={form.amount}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 550.00"
                />
                <Button disabled={loading}>
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Process Purchase'}
                </Button>
            </form>
        </Card>
    );
};

// --- Redeem Points (Updated with Error Fix) ---
const RedeemPoints: React.FC<{ setNotification: (n: NotificationState) => void }> = ({ setNotification }) => {
    // FIX: Changed state keys to camelCase
    const [form, setForm] = useState({ customerId: '', pointsToRedeem: '', rewardDescription: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        const newId = id === 'customer_id' ? 'customerId' : id === 'points_to_redeem' ? 'pointsToRedeem' : id === 'reward_description' ? 'rewardDescription' : id;

        setForm(prev => ({ ...prev, [newId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const points = Math.round(apiService.validateAndParseNumeric(form.pointsToRedeem));
            
            if (points <= 0) {
                throw new Error("Points to redeem must be a positive number.");
            }
            
            // FIX: Send camelCase fields to Java API
            const data: StatusResponseData = await apiService.fetchData('/points/redeem', 'POST', {
                customerId: form.customerId,
                pointsToRedeem: points,
                rewardDescription: form.rewardDescription,
            });
            // FIX: Read newTotalPoints from camelCase response
            setNotification({ 
                message: `Redeemed ${points} points successfully. New total: ${data.newTotalPoints}.`, 
                type: 'success',
                notificationKey: Date.now() 
            });
            // FIX: Reset form using camelCase keys
            setForm({ customerId: form.customerId, pointsToRedeem: '', rewardDescription: '' });
        } catch (error) {
            // FIX: Display the detailed error message returned from the Java server
            const errorMessage = (error as Error).message;
            setNotification({ message: errorMessage || 'Redemption failed.', type: 'error', notificationKey: Date.now() });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Redeem Points" icon={DollarSign}>
            <p className="text-gray-500 mb-6">Use points for rewards or discounts.</p>
            <form onSubmit={handleSubmit}>
                <Input
                    label="Customer ID"
                    id="customer_id"
                    value={form.customerId}
                    onChange={handleChange}
                    required
                    placeholder="e.g., CUST-001"
                />
                <Input
                    label="Points to Redeem"
                    id="points_to_redeem"
                    type="number"
                    value={form.pointsToRedeem}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 50"
                />
                <Input
                    label="Reward Description"
                    id="reward_description"
                    value={form.rewardDescription}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Free Coffee or ₹50 Voucher"
                />
                <Button className="mt-2" disabled={loading}>
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Redeem Points'}
                </Button>
            </form>
        </Card>
    );
};

// --- View and Update Component (Updated with UI Fix and Logic) ---

const ViewAndUpdate: React.FC<{ setNotification: (n: NotificationState) => void }> = ({ setNotification }) => {
    const [customerId, setCustomerId] = useState<string>('');
    const [customer, setCustomer] = useState<CustomerData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [updateName, setUpdateName] = useState<string>('');
    
    const [isTimeFetchModalOpen, setIsTimeFetchModalOpen] = useState<boolean>(false);
    const [dateRange, setDateRange] = useState<{ startDate: string, endDate: string }>({ startDate: '', endDate: '' });
    const [pointsByTimeResult, setPointsByTimeResult] = useState<PointsByTimeData | null>(null);

    const fetchCustomer = useCallback(async (id: string) => {
        if (!id) return;
        setLoading(true);
        setCustomer(null);
        setPointsByTimeResult(null); 
        try {
            const data: CustomerData = await apiService.fetchData(`/customers/${id}`);
            setCustomer(data);
            setUpdateName(data.name);
        } catch (error) {
            setNotification({ message: (error as Error).message || 'Failed to fetch customer details.', type: 'error', notificationKey: Date.now() });
        } finally {
            setLoading(false);
        }
    }, [setNotification]);

    const handleFetch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCustomer(customerId.trim());
    };
    
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = updateName.trim();
        if (!customer || trimmedName === customer.name || trimmedName.length === 0) return;

        setLoading(true);
        try {
            const updatedData: CustomerData = await apiService.fetchData(`/customers/${customerId}`, 'PUT', { name: trimmedName });
            setCustomer(updatedData);
            setNotification({ message: `Customer name updated to ${updatedData.name}.`, type: 'success', notificationKey: Date.now() });
        } catch (error) {
            setNotification({ message: (error as Error).message || 'Failed to update customer.', type: 'error', notificationKey: Date.now() });
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async () => {
        if (!window.confirm(`⚠️ WARNING: Are you sure you want to permanently delete customer ${customerId}? This cannot be undone.`)) {
            return;
        }
        
        setLoading(true);
        try {
            await apiService.fetchData(`/customers/${customerId}`, 'DELETE');
            setNotification({ message: `Customer ${customerId} successfully deleted.`, type: 'success', notificationKey: Date.now() });
            setCustomerId('');
            setCustomer(null);
            setPointsByTimeResult(null); 
        } catch (error) {
            setNotification({ message: (error as Error).message || 'Failed to delete customer.', type: 'error', notificationKey: Date.now() });
        } finally {
            setLoading(false);
        }
    };
    
    const openTimeFetchModal = () => {
        if (!customer) {
            setNotification({ message: "Please fetch a customer ID first.", type: 'info', notificationKey: Date.now() });
            return;
        }
        setDateRange({ startDate: '', endDate: '' });
        setPointsByTimeResult(null); 
        setIsTimeFetchModalOpen(true);
    }

    const handleTimeFetchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (dateRange.startDate > dateRange.endDate) {
            setNotification({ message: "Start date cannot be after the end date.", type: 'error', notificationKey: Date.now() });
            return;
        }

        setLoading(true);
        setPointsByTimeResult(null); 

        try {
            const path = `/customers/${customerId}/points-by-time?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
            const data: PointsByTimeData = await apiService.fetchData(path);
            
            setPointsByTimeResult(data);
            
            setNotification({ 
                message: `Points data fetched successfully for ${customer?.name}.`, 
                type: 'info',
                notificationKey: Date.now() 
            });
            
        } catch (error) {
            setNotification({ message: (error as Error).message || 'Failed to fetch points for the specified range.', type: 'error', notificationKey: Date.now() });
            setIsTimeFetchModalOpen(true);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePredefinedTimeFetch = async (months: number) => {
        if (!customer) {
            setNotification({ message: "Please fetch a customer ID first.", type: 'info', notificationKey: Date.now() });
            return;
        }
        
        // 1. Calculate the dates using the new utility function
        const endDate = getTodayDate(); // End date is ALWAYS today
        const startDate = getPastDate(months); // Calculated past date 

        setLoading(true);
        setPointsByTimeResult(null);

        try {
            const path = `/customers/${customerId}/points-by-time?startDate=${startDate}&endDate=${endDate}`;
            const data: PointsByTimeData = await apiService.fetchData(path);
            
            // 3. Display the result directly in the modal
            setPointsByTimeResult(data);
            setIsTimeFetchModalOpen(true); // Open modal to show results
            setDateRange({ startDate, endDate }); // Set range fields for display
            
            setNotification({ 
                message: `Last ${months} months of points fetched. Total: ${data.pointsEarned}.`, 
                type: 'info',
                notificationKey: Date.now() 
            });

        } catch (error) {
            setNotification({ message: (error as Error).message || 'Failed to fetch predefined range.', type: 'error', notificationKey: Date.now() });
            setIsTimeFetchModalOpen(false); // Close if fetching failed
        } finally {
            setLoading(false);
        }
    };


    return (
        <Card title="View & Manage Customers" icon={Edit}>
            <form onSubmit={handleFetch} className="mb-6 flex space-x-2">
                <div className="flex-grow">
                    <Input
                        label="Customer ID"
                        id="search_id"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        required
                        placeholder="Enter ID (e.g., CUST-001)"
                        className="mb-0"
                    />
                </div>
                <Button type="submit" className="self-end !w-auto min-w-[100px] mb-4" disabled={loading}>
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Fetch'}
                </Button>
            </form>

            {customer && (
                <div className="border-t pt-4">
                    <h3 className="text-lg font-bold mb-3 text-indigo-700">{customer.name}</h3>
                    
                    <div className="grid grid-cols-1 gap-4 mb-6"> 
                        <div className="bg-indigo-50 p-3 rounded-lg text-center shadow-inner">
                            <p className="text-xs text-indigo-500 font-medium">TOTAL POINTS</p>
                            <p className="text-3xl font-extrabold text-indigo-600">{customer.totalPoints}</p>
                        </div>
                    </div>
                    
                    {/* UI FIX APPLIED HERE: Using grid-cols-3 for clean layout */}
                    <div className="grid grid-cols-3 gap-2 mb-6"> 

                        {/* Last 1 Month Button */}
                        <Button 
                            onClick={() => handlePredefinedTimeFetch(1)} 
                            type="button" 
                            className="!bg-purple-500 hover:!bg-purple-600 flex items-center justify-center space-x-1" 
                            disabled={loading}
                        >
                            <span className="text-sm">Last 1 Month</span>
                        </Button>

                        {/* Last 3 Months Button */}
                        <Button 
                            onClick={() => handlePredefinedTimeFetch(3)} 
                            type="button" 
                            className="!bg-purple-700 hover:!bg-purple-800 flex items-center justify-center space-x-1" 
                            disabled={loading}
                        >
                            <span className="text-sm">Last 3 Months</span>
                        </Button>
                        
                        {/* Existing Custom Date Button */}
                        <Button 
                            onClick={openTimeFetchModal} 
                            type="button" 
                            className="!bg-blue-500 hover:!bg-blue-600 flex items-center justify-center space-x-1" 
                            disabled={loading}
                        >
                            <ArrowDownCircle className="w-4 h-4"/>
                            <span className="text-sm">Custom Range</span>
                        </Button>
                    </div>

                    <form onSubmit={handleUpdate} className="bg-gray-50 p-4 rounded-lg shadow-inner mb-4">
                        <h4 className="text-md font-semibold mb-3 text-gray-700">Update Details</h4>
                        <Input
                            label="Edit Customer Name"
                            id="update_name"
                            value={updateName}
                            onChange={(e) => setUpdateName(e.target.value)}
                            required
                            placeholder="e.g., Jane Doe"
                        />
                        <Button 
                            className="!bg-green-500 hover:!bg-green-600" 
                            disabled={loading || (customer && updateName.trim() === customer.name)}
                        >
                            {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Update Name'}
                        </Button>
                    </form>

                    <Button onClick={handleDelete} type="button" className="!bg-red-500 hover:!bg-red-600 mt-4 flex items-center justify-center space-x-2" disabled={loading}>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Customer</span>
                    </Button>
                </div>
            )}
            
            {/* Date Range Selection Modal (Now handles display of results) */}
            {isTimeFetchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <Card 
                        title="Fetch Points by Date" 
                        icon={ArrowDownCircle} 
                        className="w-full max-w-sm relative"
                    >
                        <form onSubmit={handleTimeFetchSubmit}>
                            <Input
                                label="Start Date (YYYY-MM-DD)"
                                id="start_date"
                                type="date"
                                value={dateRange.startDate} 
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                required
                                placeholder=""
                            />
                            <Input
                                label="End Date (YYYY-MM-DD)"
                                id="end_date"
                                type="date"
                                value={dateRange.endDate} 
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                required
                                placeholder=""
                            />

                            {/* Conditional Display of Results */}
                            {pointsByTimeResult && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-semibold text-blue-700 mb-2">Results for {customer?.name}</p>
                                    <div className="text-2xl font-extrabold text-blue-800">
                                        {pointsByTimeResult.pointsEarned} Points Earned
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Between {new Date(pointsByTimeResult.startDate).toLocaleDateString()} 
                                        and {new Date(pointsByTimeResult.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                            )}

                            <div className="flex space-x-3 mt-4">
                                <Button 
                                    type="button" 
                                    onClick={() => setIsTimeFetchModalOpen(false)} 
                                    className="!bg-gray-400 hover:!bg-gray-500" 
                                    disabled={loading}
                                >
                                    Close
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={!dateRange.startDate || !dateRange.endDate || loading}
                                >
                                    {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Fetch Points'}
                                </Button>
                            </div>
                        </form>
                        <button 
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800" 
                            onClick={() => setIsTimeFetchModalOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </Card>
                </div>
            )}
        </Card>
    );
};


// --- Main Application Component (Unchanged) ---

const App = () => {
    const [currentPage, setCurrentPage] = useState<string>('list'); 
    
    const [notification, setNotificationState] = useState<NotificationState>({ 
        message: '', 
        type: 'info', 
        notificationKey: 0 
    });

    const notify = useCallback((newNotification: NotificationState) => {
        if (newNotification.message) {
            setNotificationState({ ...newNotification, notificationKey: Date.now() }); 
            setTimeout(() => setNotificationState({ message: '', type: 'info', notificationKey: 0 }), 5000); 
        }
    }, []); 

    const renderContent = () => {
        switch (currentPage) {
            case 'list': 
                return <CustomerList setNotification={notify} />;
            case 'register':
                return <RegisterCustomer setNotification={notify} />;
            case 'view': 
                return <ViewAndUpdate setNotification={notify} />;
            case 'earn':
                return <EarnPoints setNotification={notify} />;
            case 'redeem':
                return <RedeemPoints setNotification={notify} />;
            default:
                return <CustomerList setNotification={notify} />;
        }
    };
    
    interface NavItem {
        id: string;
        label: string;
        icon: LucideIcon;
    }

    const navItems: NavItem[] = [
        
        { id: 'list', label: 'View All Customers', icon: Users }, 
        { id: 'view', label: 'View & Manage', icon: Edit },
        { id: 'earn', label: 'Earn Points', icon: ShoppingBag },
        { id: 'redeem', label: 'Redeem Points', icon: DollarSign },
        { id: 'register', label: 'New Customer', icon: User },
    ];

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            
            {/* Header */}
            <header className="bg-indigo-800 shadow-md py-4">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">Elahi Super Market</h1>
                    <p className="text-sm text-indigo-200">Elahi Points System</p>
                </div>
            </header>

            {/* Main Layout */}
            <main className="container mx-auto px-4 py-8">
                {/* Navigation Tabs */}
                <div className="mb-8 border-b border-gray-300">
                    <nav className="flex space-x-4 overflow-x-auto pb-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentPage(item.id)}
                                className={`flex items-center space-x-2 py-2 px-4 rounded-t-lg font-medium transition-colors duration-150 
                                    ${currentPage === item.id
                                        ? 'text-indigo-700 bg-white border-b-2 border-indigo-700 shadow-t-md'
                                        : 'text-gray-600 hover:text-indigo-500'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                
                {/* Content Area - Uses max-w-full for the list component */}
                <div className={`${currentPage === 'list' ? 'max-w-full' : 'max-w-xl mx-auto'}`}>
                    {renderContent()}
                </div>
            </main>

            {/* Notification */}
            <Notification 
                message={notification.message} 
                type={notification.type} 
                onClose={() => setNotificationState({ message: '', type: 'info', notificationKey: 0 })} 
                notificationKey={notification.notificationKey} 
            />
            
            {/* Footer */}
            <footer className="py-4 text-center text-gray-500 text-sm border-t mt-12">
                Elahi Super Market | Points System
            </footer>
        </div>
    );
};

export default App;