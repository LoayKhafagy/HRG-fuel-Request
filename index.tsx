import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid'; // Using a library for unique IDs

// --- TYPE DEFINITIONS ---
type Message = {
  id: string;
  sender: 'Client' | 'Company';
  text: string;
  timestamp: Date;
};

type RequestStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

type FuelingRequest = {
  id: string;
  clientId: string;
  standNumber: string;
  airline: string;
  flightNumber: string;
  representativeName: string;
  status: RequestStatus;
  messages: Message[];
  hasUnreadUpdates: boolean;
};

// --- MOCK INITIAL DATA ---
const initialRequests: FuelingRequest[] = [
  {
    id: 'req-1',
    clientId: 'client-abc',
    standNumber: 'B7',
    airline: 'مصر للطيران',
    flightNumber: 'MS612',
    representativeName: 'أحمد محمود',
    status: 'Pending',
    messages: [],
    hasUnreadUpdates: false,
  },
  {
    id: 'req-2',
    clientId: 'client-xyz',
    standNumber: 'C3',
    airline: 'العربية للطيران',
    flightNumber: 'G9-261',
    representativeName: 'فاطمة الزهراء',
    status: 'Confirmed',
    messages: [
        { id: 'msg-1', sender: 'Company', text: 'تم التأكيد، الفريق في الطريق.', timestamp: new Date(Date.now() - 5 * 60000) },
        { id: 'msg-2', sender: 'Client', text: 'شكرًا لكم، في الانتظار.', timestamp: new Date(Date.now() - 3 * 60000) }
    ],
    hasUnreadUpdates: true,
  },
];


// --- UTILITY FUNCTIONS ---
const getClientId = (): string => {
    let clientId = localStorage.getItem('fuelingServiceClientId');
    if (!clientId) {
        clientId = uuidv4();
        localStorage.setItem('fuelingServiceClientId', clientId);
    }
    return clientId;
};

const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};

// --- UI COMPONENTS ---

const Header: React.FC = () => (
    <header className="app-header">
        <h1>شركة مصر للبترول</h1>
        <h2>خدمة تموين الطائرات</h2>
        <h3>مطار الغردقة الدولى</h3>
    </header>
);

const SuccessToast: React.FC<{ message: string; isVisible: boolean }> = ({ message, isVisible }) => (
    <div className={`success-toast ${isVisible ? 'visible' : ''}`}>
        {message}
    </div>
);

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="modal-actions">
                    <button onClick={onCancel} className="btn-secondary">تراجع</button>
                    <button onClick={onConfirm} className="btn-danger">تأكيد</button>
                </div>
            </div>
        </div>
    );
};


const ChatInterface: React.FC<{ messages: Message[]; onSendMessage: (text: string) => void; senderType: 'Client' | 'Company' }> = ({ messages, onSendMessage, senderType }) => {
    const [newMessage, setNewMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="chat-interface">
            <div className="messages-list">
                {messages.length === 0 ? (
                    <p className="no-messages">لا توجد رسائل بعد.</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`message message-${msg.sender}`}>
                           <div className="message-text">{msg.text}</div>
                           <div className="message-timestamp">{formatTime(msg.timestamp)}</div>
                        </div>
                    ))
                )}
            </div>
            <form onSubmit={handleSubmit} className="chat-input-form">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    aria-label="اكتب رسالتك"
                />
                <button type="submit" aria-label="إرسال الرسالة">إرسال</button>
            </form>
        </div>
    );
};


const RequestCard: React.FC<{
    request: FuelingRequest;
    view: 'Client' | 'Company';
    onStatusChange?: (id: string, newStatus: RequestStatus) => void;
    onSendMessage: (requestId: string, text: string) => void;
    onToggleChat: (requestId: string) => void;
    onCancelRequest?: (requestId: string) => void;
    isChatOpen: boolean;
}> = ({ request, view, onStatusChange, onSendMessage, onToggleChat, onCancelRequest, isChatOpen }) => {

    const handleSendMessage = (text: string) => {
        onSendMessage(request.id, text);
    };

    return (
        <div className={`request-card status-${request.status.toLowerCase()}`}>
            <div className="card-header">
                <h3>رحلة {request.flightNumber} - {request.airline}</h3>
                <span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>
            </div>
            <div className="card-body">
                <div className="info-item"><strong>رقم الاستاند:</strong> {request.standNumber}</div>
                <div className="info-item"><strong>اسم المندوب:</strong> {request.representativeName}</div>
            </div>
            <div className="card-footer">
                <button className="btn-message" onClick={() => onToggleChat(request.id)}>
                    {isChatOpen ? 'إغلاق الرسائل' : 'عرض الرسائل'}
                    {view === 'Client' && request.hasUnreadUpdates && <span className="notification-dot"></span>}
                </button>
                {view === 'Company' && onStatusChange && onCancelRequest && (
                    <div className="status-actions">
                        <button onClick={() => onStatusChange(request.id, 'Confirmed')} disabled={request.status === 'Confirmed' || request.status === 'Completed' || request.status === 'Cancelled'}>تأكيد</button>
                        <button onClick={() => onStatusChange(request.id, 'Completed')} disabled={request.status === 'Completed' || request.status === 'Cancelled'}>إكمال</button>
                        <button onClick={() => onCancelRequest(request.id)} className="btn-cancel" disabled={request.status === 'Completed' || request.status === 'Cancelled'}>إلغاء</button>
                    </div>
                )}
            </div>
            {isChatOpen && <ChatInterface messages={request.messages} onSendMessage={handleSendMessage} senderType={view} />}
        </div>
    );
};


// --- VIEWS ---

const ClientView: React.FC<{
    requests: FuelingRequest[];
    addRequest: (newRequestData: Omit<FuelingRequest, 'id' | 'clientId' | 'status' | 'messages' | 'hasUnreadUpdates'>) => void;
    updateRequest: (updatedRequest: FuelingRequest) => void;
    clientId: string;
}> = ({ requests, addRequest, updateRequest, clientId }) => {
    const [formData, setFormData] = useState({
        standNumber: '', airline: '', flightNumber: '', representativeName: '',
    });
    const [errors, setErrors] = useState<Partial<typeof formData>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [openChatId, setOpenChatId] = useState<string | null>(null);

    const clientRequests = useMemo(() => requests.filter(r => r.clientId === clientId).sort((a, b) => a.status === 'Pending' ? -1 : 1), [requests, clientId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (value.trim()) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validateForm = () => {
        const newErrors: Partial<typeof formData> = {};
        Object.keys(formData).forEach(key => {
            if (!formData[key as keyof typeof formData].trim()) {
                newErrors[key as keyof typeof formData] = 'هذا الحقل مطلوب';
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setTimeout(() => { // Simulate network delay
            addRequest(formData);
            setFormData({ standNumber: '', airline: '', flightNumber: '', representativeName: '' });
            setIsSubmitting(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000); // Hide after 3 seconds
        }, 500);
    };
    
    const handleToggleChat = (requestId: string) => {
        setOpenChatId(prevId => (prevId === requestId ? null : requestId));
        const request = clientRequests.find(r => r.id === requestId);
        if (request && request.hasUnreadUpdates) {
            updateRequest({ ...request, hasUnreadUpdates: false });
        }
    };
    
    const handleSendMessage = (requestId: string, text: string) => {
        const requestToUpdate = requests.find(r => r.id === requestId);
        if (requestToUpdate) {
            const newMessage: Message = { id: uuidv4(), sender: 'Client', text, timestamp: new Date() };
            updateRequest({ ...requestToUpdate, messages: [...requestToUpdate.messages, newMessage] });
        }
    };

    return (
        <div className="view-container">
            <SuccessToast message="تم إرسال طلبك بنجاح!" isVisible={showSuccess} />
            <div className="form-container card">
                <h2 className="view-header">تقديم طلب تموين جديد</h2>
                <form onSubmit={handleSubmit} className="request-form" noValidate>
                    <div className="form-grid">
                        <div className="form-field">
                            <input name="standNumber" value={formData.standNumber} onChange={handleInputChange} placeholder="الموقع: رقم الاستاند" aria-label="رقم الاستاند" />
                             {errors.standNumber && <span className="error-message">{errors.standNumber}</span>}
                        </div>
                        <div className="form-field">
                            <input name="airline" value={formData.airline} onChange={handleInputChange} placeholder="شركة الطيران" aria-label="شركة الطيران" />
                            {errors.airline && <span className="error-message">{errors.airline}</span>}
                        </div>
                        <div className="form-field">
                            <input name="flightNumber" value={formData.flightNumber} onChange={handleInputChange} placeholder="رقم الرحلة" aria-label="رقم الرحلة" />
                             {errors.flightNumber && <span className="error-message">{errors.flightNumber}</span>}
                        </div>
                        <div className="form-field">
                            <input name="representativeName" value={formData.representativeName} onChange={handleInputChange} placeholder="اسم مندوب الطائرة" aria-label="اسم مندوب الطائرة" />
                            {errors.representativeName && <span className="error-message">{errors.representativeName}</span>}
                        </div>
                    </div>
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                    </button>
                </form>
            </div>

            <section className="client-requests-section">
                <h2 className="view-header">طلباتك الحالية</h2>
                {clientRequests.length > 0 ? (
                     clientRequests.map(req => (
                        <RequestCard
                            key={req.id}
                            request={req}
                            view="Client"
                            onSendMessage={handleSendMessage}
                            onToggleChat={handleToggleChat}
                            isChatOpen={openChatId === req.id}
                        />
                    ))
                ) : (
                    <p className="empty-state-message">ليس لديك أي طلبات حالية.</p>
                )}
            </section>
        </div>
    );
};

const CompanyView: React.FC<{
    requests: FuelingRequest[];
    setRequests: React.Dispatch<React.SetStateAction<FuelingRequest[]>>;
}> = ({ requests, setRequests }) => {
    const [openChatId, setOpenChatId] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{isOpen: boolean; action?: 'clearCompleted' | 'cancelRequest'; requestId?: string}>({isOpen: false});

    const updateRequest = (updatedRequest: FuelingRequest) => {
        setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
    };

    const handleStatusChange = (id: string, newStatus: RequestStatus) => {
        const requestToUpdate = requests.find(r => r.id === id);
        if (requestToUpdate) {
            updateRequest({ ...requestToUpdate, status: newStatus, hasUnreadUpdates: true });
        }
    };
    
    const handleSendMessage = (requestId: string, text: string) => {
        const requestToUpdate = requests.find(r => r.id === requestId);
        if (requestToUpdate) {
            const newMessage: Message = { id: uuidv4(), sender: 'Company', text, timestamp: new Date() };
            updateRequest({
                ...requestToUpdate,
                messages: [...requestToUpdate.messages, newMessage],
                hasUnreadUpdates: true,
            });
        }
    };

    const handleToggleChat = (requestId: string) => {
        setOpenChatId(prevId => (prevId === requestId ? null : requestId));
    };

    const handleConfirmAction = () => {
        if (modalState.action === 'clearCompleted') {
            setRequests(prev => prev.filter(r => r.status !== 'Completed'));
        }
        if (modalState.action === 'cancelRequest' && modalState.requestId) {
            handleStatusChange(modalState.requestId, 'Cancelled');
        }
        setModalState({isOpen: false});
    };

    const hasCompletedRequests = useMemo(() => requests.some(r => r.status === 'Completed'), [requests]);

    return (
        <div className="view-container">
            <ConfirmationModal 
                isOpen={modalState.isOpen}
                title={modalState.action === 'clearCompleted' ? "تأكيد المسح" : "تأكيد الإلغاء"}
                message={modalState.action === 'clearCompleted' ? "هل أنت متأكد من رغبتك في مسح جميع الطلبات المكتملة؟ لا يمكن التراجع عن هذا الإجراء." : "هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟"}
                onConfirm={handleConfirmAction}
                onCancel={() => setModalState({isOpen: false})}
            />
            <div className="company-dashboard-header">
                 <h2 className="view-header">لوحة تحكم طلبات التموين</h2>
                 {hasCompletedRequests && (
                    <button onClick={() => setModalState({isOpen: true, action: 'clearCompleted'})} className="btn-clear-completed">مسح الطلبات المكتملة</button>
                 )}
            </div>
            {requests.length > 0 ? (
                requests.map(req => (
                    <RequestCard
                        key={req.id}
                        request={req}
                        view="Company"
                        onStatusChange={handleStatusChange}
                        onSendMessage={handleSendMessage}
                        onToggleChat={handleToggleChat}
                        onCancelRequest={(requestId) => setModalState({isOpen: true, action: 'cancelRequest', requestId})}
                        isChatOpen={openChatId === req.id}
                    />
                ))
            ) : (
                <p className="empty-state-message">لا توجد طلبات حالية.</p>
            )}
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    const [requests, setRequests] = useState<FuelingRequest[]>(() => {
        // Lazy initialization to avoid running on every render
        const savedRequests = localStorage.getItem('fuelingRequests');
        return savedRequests ? JSON.parse(savedRequests, (key, value) => {
            if (key === 'timestamp') return new Date(value);
            return value;
        }) : initialRequests;
    });
    
    const [view, setView] = useState<'Client' | 'Company'>('Client');
    const clientId = useMemo(() => getClientId(), []);

    // Effect to save requests to localStorage on change
    useEffect(() => {
        localStorage.setItem('fuelingRequests', JSON.stringify(requests));
    }, [requests]);

    // Effect to get view from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        setView(viewParam === 'company' ? 'Company' : 'Client');
    }, []);

    const addRequest = useCallback((newRequestData: Omit<FuelingRequest, 'id' | 'clientId' | 'status' | 'messages'| 'hasUnreadUpdates'>) => {
        const newRequest: FuelingRequest = {
            id: uuidv4(),
            clientId: clientId,
            ...newRequestData,
            status: 'Pending',
            messages: [],
            hasUnreadUpdates: false,
        };
        setRequests(prev => [newRequest, ...prev]);
    }, [clientId]);
    
    const updateRequest = useCallback((updatedRequest: FuelingRequest) => {
        setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
    }, []);


    return (
        <main>
            <Header />
            {view === 'Client' ? (
                <ClientView requests={requests} addRequest={addRequest} updateRequest={updateRequest} clientId={clientId} />
            ) : (
                <CompanyView requests={requests} setRequests={setRequests} />
            )}
        </main>
    );
};


// --- RENDER ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element with id="root" in the document. The React application could not be mounted.');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
