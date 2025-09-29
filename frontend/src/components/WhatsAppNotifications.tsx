import React, { useState, useEffect } from 'react';
import {
  ChatBubbleBottomCenterTextIcon,
  BellAlertIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface WhatsAppMessage {
  id: string;
  to: string;
  from?: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'template' | 'alert';
  priority?: 'high' | 'medium' | 'low';
}

interface Contact {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen?: Date;
}

interface Template {
  id: string;
  name: string;
  category: string;
  variables: string[];
  preview: string;
}

const WhatsAppNotifications: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'messages' | 'templates' | 'broadcast'>('messages');
  const [isConnected, setIsConnected] = useState(true);

  // Mock data
  const mockContacts: Contact[] = [
    {
      id: '1',
      name: 'Operations Supervisor',
      role: 'SUPERVISOR',
      phoneNumber: '+91-9876543210',
      status: 'online',
      lastSeen: new Date()
    },
    {
      id: '2',
      name: 'Maintenance Manager',
      role: 'MAINTENANCE',
      phoneNumber: '+91-9876543211',
      status: 'busy',
      lastSeen: new Date(Date.now() - 600000)
    },
    {
      id: '3',
      name: 'System Admin',
      role: 'ADMIN',
      phoneNumber: '+91-9876543212',
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000)
    }
  ];

  const mockTemplates: Template[] = [
    {
      id: 'emergency',
      name: 'Emergency Alert',
      category: 'Critical',
      variables: ['trainsetNumber', 'issue'],
      preview: '🚨 URGENT: Trainset {trainsetNumber} - {issue}'
    },
    {
      id: 'fitness',
      name: 'Fitness Expiry',
      category: 'Maintenance',
      variables: ['trainsetNumber', 'days'],
      preview: '⚠️ Trainset {trainsetNumber} fitness expires in {days} days'
    },
    {
      id: 'optimization',
      name: 'Optimization Complete',
      category: 'Operations',
      variables: ['inService', 'maintenance', 'standby'],
      preview: '✅ Schedule ready: {inService} service, {maintenance} maintenance, {standby} standby'
    },
    {
      id: 'daily',
      name: 'Daily Summary',
      category: 'Reports',
      variables: ['punctuality', 'availability'],
      preview: '📊 Daily: {punctuality}% punctuality, {availability}% availability'
    }
  ];

  useEffect(() => {
    // Initialize with mock data
    setContacts(mockContacts);
    
    // Simulate incoming messages
    const interval = setInterval(() => {
      const randomMessage: WhatsAppMessage = {
        id: `msg-${Date.now()}`,
        from: mockContacts[Math.floor(Math.random() * mockContacts.length)].phoneNumber,
        to: 'System',
        content: getRandomMessage(),
        timestamp: new Date(),
        status: 'delivered',
        type: 'text',
        priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any
      };
      
      setMessages(prev => [randomMessage, ...prev].slice(0, 50));
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getRandomMessage = (): string => {
    const messages = [
      'Trainset TS-005 maintenance completed',
      'All systems operational',
      'Schedule optimization requested',
      'Fitness certificate expiring for TS-003',
      'Emergency maintenance required for TS-007'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedContact) return;

    const newMessage: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      to: selectedContact.phoneNumber,
      content: messageInput,
      timestamp: new Date(),
      status: 'pending',
      type: 'text',
      priority: 'medium'
    };

    setMessages(prev => [newMessage, ...prev]);
    setMessageInput('');

    // Simulate sending
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );
      toast.success('Message sent successfully');
    }, 1000);

    // Simulate delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'delivered' }
            : msg
        )
      );
    }, 2000);
  };

  const sendTemplate = () => {
    if (!selectedTemplate || !selectedContact) return;

    let content = selectedTemplate.preview;
    selectedTemplate.variables.forEach(variable => {
      content = content.replace(`{${variable}}`, templateVars[variable] || '');
    });

    const newMessage: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      to: selectedContact.phoneNumber,
      content,
      timestamp: new Date(),
      status: 'sent',
      type: 'template',
      priority: selectedTemplate.category === 'Critical' ? 'high' : 'medium'
    };

    setMessages(prev => [newMessage, ...prev]);
    toast.success('Template message sent');
    setTemplateVars({});
  };

  const broadcastMessage = (role: string) => {
    const roleContacts = contacts.filter(c => c.role === role);
    
    roleContacts.forEach(contact => {
      const message: WhatsAppMessage = {
        id: `msg-${Date.now()}-${contact.id}`,
        to: contact.phoneNumber,
        content: `Broadcast: System maintenance scheduled for tonight`,
        timestamp: new Date(),
        status: 'sent',
        type: 'alert',
        priority: 'high'
      };
      
      setMessages(prev => [message, ...prev]);
    });
    
    toast.success(`Broadcast sent to ${roleContacts.length} ${role} contacts`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="h-4 w-4 text-gray-400" />;
      case 'delivered':
        return (
          <div className="flex">
            <CheckCircleIcon className="h-4 w-4 text-gray-400" />
            <CheckCircleIcon className="h-4 w-4 text-gray-400 -ml-2" />
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <CheckCircleIcon className="h-4 w-4 text-blue-500" />
            <CheckCircleIcon className="h-4 w-4 text-blue-500 -ml-2" />
          </div>
        );
      case 'failed':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-300" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChatBubbleBottomCenterTextIcon className="h-8 w-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">WhatsApp Notifications</h2>
            <p className="text-sm text-gray-500">Real-time communication with operators</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('messages')}
          className={`pb-2 px-1 text-sm font-medium transition-colors ${
            activeTab === 'messages'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Messages
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-2 px-1 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`pb-2 px-1 text-sm font-medium transition-colors ${
            activeTab === 'broadcast'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Broadcast
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts List */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Contacts</h3>
          <div className="space-y-2">
            {contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedContact?.id === contact.id
                    ? 'bg-green-50 border border-green-300'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                    <div className={`h-2 w-2 rounded-full ${
                      contact.status === 'online' ? 'bg-green-500' :
                      contact.status === 'busy' ? 'bg-yellow-500' :
                      'bg-gray-300'
                    }`} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{contact.phoneNumber}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'messages' && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Message Input */}
                {selectedContact && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      Send to: {selectedContact.name}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        onClick={sendMessage}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        Send
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No messages yet</p>
                  ) : (
                    messages.map(message => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.from ? 'bg-gray-100' : 'bg-green-50 ml-auto max-w-[80%]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">
                              {message.from || message.to} • {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-gray-900">{message.content}</p>
                          </div>
                          <div className="ml-2">{getStatusIcon(message.status)}</div>
                        </div>
                        {message.priority === 'high' && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            High Priority
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="space-y-4">
                  {mockTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <span className="text-xs text-gray-500">{template.category}</span>
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.preview}</p>
                      
                      {selectedTemplate?.id === template.id && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                          {template.variables.map(variable => (
                            <div key={variable}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {variable}
                              </label>
                              <input
                                type="text"
                                value={templateVars[variable] || ''}
                                onChange={(e) => setTemplateVars({
                                  ...templateVars,
                                  [variable]: e.target.value
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder={`Enter ${variable}`}
                              />
                            </div>
                          ))}
                          <button
                            onClick={sendTemplate}
                            disabled={!selectedContact}
                            className="w-full mt-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Send Template to {selectedContact?.name || 'Select Contact'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'broadcast' && (
              <motion.div
                key="broadcast"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="space-y-4">
                  <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <BellAlertIcon className="h-6 w-6 text-yellow-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Broadcast Message</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Send important notifications to all contacts in a specific role group.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                        onClick={() => broadcastMessage('SUPERVISOR')}
                        className="p-4 bg-white rounded-lg border border-gray-200 hover:border-yellow-400 transition-colors"
                      >
                        <UserGroupIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                        <p className="font-medium">Supervisors</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {contacts.filter(c => c.role === 'SUPERVISOR').length} contacts
                        </p>
                      </button>
                      
                      <button
                        onClick={() => broadcastMessage('MAINTENANCE')}
                        className="p-4 bg-white rounded-lg border border-gray-200 hover:border-yellow-400 transition-colors"
                      >
                        <UserGroupIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                        <p className="font-medium">Maintenance</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {contacts.filter(c => c.role === 'MAINTENANCE').length} contacts
                        </p>
                      </button>
                      
                      <button
                        onClick={() => broadcastMessage('ADMIN')}
                        className="p-4 bg-white rounded-lg border border-gray-200 hover:border-yellow-400 transition-colors"
                      >
                        <UserGroupIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                        <p className="font-medium">Administrators</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {contacts.filter(c => c.role === 'ADMIN').length} contacts
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Recent Broadcasts</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">System maintenance alert</span>
                        <span className="text-gray-500">2 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Schedule optimization complete</span>
                        <span className="text-gray-500">5 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Emergency maintenance TS-007</span>
                        <span className="text-gray-500">Yesterday</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppNotifications;
