/**
 * WhatsApp Business API Integration Service
 * For sending notifications and alerts to KMRL operators
 */

import EventEmitter from 'events';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  content: string;
  priority?: 'high' | 'medium' | 'low';
  templateId?: string;
  parameters?: Record<string, any>;
}

interface NotificationTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

interface WhatsAppContact {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  preferences: {
    receiveAlerts: boolean;
    alertTypes: string[];
    quietHours: { start: string; end: string };
  };
}

export class WhatsAppService extends EventEmitter {
  private static instance: WhatsAppService;
  private isConnected: boolean = false;
  private messageQueue: WhatsAppMessage[] = [];
  private contacts: Map<string, WhatsAppContact> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private webhookUrl: string = process.env.WHATSAPP_WEBHOOK_URL || 'https://api.whatsapp.com/mock';
  private businessPhoneId: string = process.env.WHATSAPP_BUSINESS_PHONE_ID || 'mock-phone-id';
  private accessToken: string = process.env.WHATSAPP_ACCESS_TOKEN || 'mock-token';

  private constructor() {
    super();
    this.initializeTemplates();
    this.initializeContacts();
    this.connect();
  }

  static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  private initializeTemplates(): void {
    // Predefined message templates for common scenarios
    const templates: NotificationTemplate[] = [
      {
        id: 'emergency_maintenance',
        name: 'Emergency Maintenance Alert',
        content: '🚨 URGENT: Trainset {{trainsetNumber}} requires immediate maintenance. Issue: {{issue}}. Priority: {{priority}}. Please acknowledge.',
        variables: ['trainsetNumber', 'issue', 'priority']
      },
      {
        id: 'fitness_expiry',
        name: 'Fitness Certificate Expiry Warning',
        content: '⚠️ FITNESS ALERT: Trainset {{trainsetNumber}} fitness certificate expires in {{days}} days. Schedule renewal immediately.',
        variables: ['trainsetNumber', 'days']
      },
      {
        id: 'schedule_change',
        name: 'Schedule Change Notification',
        content: '📅 SCHEDULE UPDATE: {{changeType}} for {{date}}. Affected trainsets: {{trainsets}}. New timing: {{timing}}.',
        variables: ['changeType', 'date', 'trainsets', 'timing']
      },
      {
        id: 'optimization_complete',
        name: 'Optimization Complete',
        content: '✅ AI Optimization Complete for {{date}}. In Service: {{inService}}, Maintenance: {{maintenance}}, Standby: {{standby}}. View dashboard for details.',
        variables: ['date', 'inService', 'maintenance', 'standby']
      },
      {
        id: 'conflict_detected',
        name: 'Scheduling Conflict Alert',
        content: '⚠️ CONFLICT: {{conflictType}} detected for {{trainsets}}. Manual intervention required. Suggested resolution: {{suggestion}}.',
        variables: ['conflictType', 'trainsets', 'suggestion']
      },
      {
        id: 'daily_summary',
        name: 'Daily Operations Summary',
        content: '📊 Daily Summary {{date}}\n✓ Punctuality: {{punctuality}}%\n✓ Fleet Availability: {{availability}}%\n✓ Maintenance Completed: {{maintenance}}\n✓ Energy Consumed: {{energy}} kWh',
        variables: ['date', 'punctuality', 'availability', 'maintenance', 'energy']
      },
      {
        id: 'branding_compliance',
        name: 'Branding SLA Alert',
        content: '💼 BRANDING ALERT: Contract {{contractId}} compliance at {{percentage}}%. Required: {{required}}%. Adjust schedule to avoid penalties.',
        variables: ['contractId', 'percentage', 'required']
      },
      {
        id: 'shift_handover',
        name: 'Shift Handover Summary',
        content: '🔄 SHIFT HANDOVER {{shift}}\nActive Issues: {{issues}}\nPending Decisions: {{pending}}\nPriority Actions: {{actions}}',
        variables: ['shift', 'issues', 'pending', 'actions']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private initializeContacts(): void {
    // Mock contacts for KMRL personnel
    const contacts: WhatsAppContact[] = [
      {
        id: 'supervisor-1',
        name: 'Operations Supervisor',
        role: 'SUPERVISOR',
        phoneNumber: '+91-9876543210',
        preferences: {
          receiveAlerts: true,
          alertTypes: ['emergency', 'conflict', 'optimization'],
          quietHours: { start: '23:00', end: '06:00' }
        }
      },
      {
        id: 'maintenance-1',
        name: 'Maintenance Manager',
        role: 'MAINTENANCE',
        phoneNumber: '+91-9876543211',
        preferences: {
          receiveAlerts: true,
          alertTypes: ['emergency', 'fitness', 'maintenance'],
          quietHours: { start: '22:00', end: '07:00' }
        }
      },
      {
        id: 'admin-1',
        name: 'System Administrator',
        role: 'ADMIN',
        phoneNumber: '+91-9876543212',
        preferences: {
          receiveAlerts: true,
          alertTypes: ['all'],
          quietHours: { start: '00:00', end: '05:00' }
        }
      }
    ];

    contacts.forEach(contact => {
      this.contacts.set(contact.id, contact);
    });
  }

  private async connect(): Promise<void> {
    try {
      // Simulate WhatsApp Business API connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.isConnected = true;
      this.emit('connected');
      console.log('✅ WhatsApp Business API connected');
      
      // Process queued messages
      this.processMessageQueue();
    } catch (error) {
      console.error('❌ WhatsApp connection failed:', error);
      this.isConnected = false;
      this.emit('connection_error', error);
      
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  async sendMessage(message: WhatsAppMessage): Promise<boolean> {
    if (!this.isConnected) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      // Check quiet hours
      const contact = this.getContactByPhone(message.to);
      if (contact && this.isQuietHours(contact)) {
        this.messageQueue.push(message);
        return false;
      }

      // Simulate API call to WhatsApp Business API
      const response = await this.mockApiCall('/messages', {
        messaging_product: 'whatsapp',
        to: message.to,
        type: message.type,
        text: { body: message.content }
      });

      this.emit('message_sent', {
        ...message,
        timestamp: new Date(),
        messageId: response.messageId
      });

      console.log(`📱 WhatsApp message sent to ${message.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      this.emit('message_failed', { message, error });
      return false;
    }
  }

  async sendTemplate(
    templateId: string,
    to: string,
    parameters: Record<string, any>
  ): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) {
      console.error(`Template ${templateId} not found`);
      return false;
    }

    // Replace variables in template
    let content = template.content;
    template.variables.forEach(variable => {
      const value = parameters[variable] || '';
      content = content.replace(`{{${variable}}}`, value);
    });

    return this.sendMessage({
      to,
      type: 'template',
      content,
      templateId
    });
  }

  async broadcastToRole(
    role: string,
    templateId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    const contacts = Array.from(this.contacts.values())
      .filter(contact => contact.role === role && contact.preferences.receiveAlerts);

    for (const contact of contacts) {
      await this.sendTemplate(templateId, contact.phoneNumber, parameters);
    }
  }

  async sendEmergencyAlert(trainsetNumber: string, issue: string): Promise<void> {
    await this.broadcastToRole('SUPERVISOR', 'emergency_maintenance', {
      trainsetNumber,
      issue,
      priority: 'CRITICAL'
    });

    await this.broadcastToRole('MAINTENANCE', 'emergency_maintenance', {
      trainsetNumber,
      issue,
      priority: 'CRITICAL'
    });
  }

  async sendFitnessExpiryAlert(trainsetNumber: string, days: number): Promise<void> {
    if (days <= 7) {
      await this.broadcastToRole('SUPERVISOR', 'fitness_expiry', {
        trainsetNumber,
        days
      });
    }
  }

  async sendOptimizationComplete(stats: any): Promise<void> {
    await this.broadcastToRole('SUPERVISOR', 'optimization_complete', {
      date: new Date().toLocaleDateString(),
      inService: stats.inService,
      maintenance: stats.maintenance,
      standby: stats.standby
    });
  }

  async sendConflictAlert(conflictType: string, trainsets: string[], suggestion: string): Promise<void> {
    await this.broadcastToRole('SUPERVISOR', 'conflict_detected', {
      conflictType,
      trainsets: trainsets.join(', '),
      suggestion
    });
  }

  async sendDailySummary(metrics: any): Promise<void> {
    await this.broadcastToRole('ADMIN', 'daily_summary', {
      date: new Date().toLocaleDateString(),
      punctuality: metrics.punctuality,
      availability: metrics.availability,
      maintenance: metrics.maintenanceCompleted,
      energy: metrics.energyConsumed
    });
  }

  async sendBrandingAlert(contractId: string, currentPercentage: number, required: number): Promise<void> {
    if (currentPercentage < required) {
      await this.broadcastToRole('SUPERVISOR', 'branding_compliance', {
        contractId,
        percentage: currentPercentage,
        required
      });
    }
  }

  private isQuietHours(contact: WhatsAppContact): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(contact.preferences.quietHours.start.split(':')[0]);
    const endHour = parseInt(contact.preferences.quietHours.end.split(':')[0]);

    if (startHour > endHour) {
      // Quiet hours span midnight
      return currentHour >= startHour || currentHour < endHour;
    } else {
      return currentHour >= startHour && currentHour < endHour;
    }
  }

  private getContactByPhone(phoneNumber: string): WhatsAppContact | undefined {
    return Array.from(this.contacts.values())
      .find(contact => contact.phoneNumber === phoneNumber);
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.sendMessage(message);
        // Rate limiting - wait 1 second between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async mockApiCall(endpoint: string, data: any): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    // Return mock response
    return {
      success: true,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  }

  // Interactive message support for quick actions
  async sendInteractiveMessage(
    to: string,
    header: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<boolean> {
    const message = {
      to,
      type: 'interactive' as const,
      content: body,
      parameters: {
        header,
        buttons
      }
    };

    return this.sendMessage(message);
  }

  // Get message history
  getMessageHistory(phoneNumber?: string): any[] {
    // This would connect to a database in production
    return [];
  }

  // Handle incoming messages (webhooks)
  handleIncomingMessage(data: any): void {
    this.emit('message_received', data);
    
    // Process commands if any
    if (data.text && data.text.toLowerCase().startsWith('/')) {
      this.processCommand(data);
    }
  }

  private processCommand(data: any): void {
    const command = data.text.toLowerCase().split(' ')[0];
    
    switch (command) {
      case '/status':
        this.sendMessage({
          to: data.from,
          type: 'text',
          content: 'System Status: ✅ All systems operational'
        });
        break;
      
      case '/help':
        this.sendMessage({
          to: data.from,
          type: 'text',
          content: 'Available commands:\n/status - System status\n/schedule - Today\'s schedule\n/alerts - Recent alerts'
        });
        break;
      
      default:
        this.sendMessage({
          to: data.from,
          type: 'text',
          content: 'Unknown command. Type /help for available commands.'
        });
    }
  }

  // Cleanup
  disconnect(): void {
    this.isConnected = false;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const whatsappService = WhatsAppService.getInstance();
