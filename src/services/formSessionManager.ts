import { FormSession, FormField, Message, MessageType, PurchaseInquiryData } from '../types';

/**
 * Form definitions for purchase inquiry
 */
const PURCHASE_INQUIRY_FORM: FormField[] = [
  {
    name: 'tipePembeli',
    question: 'Kamu beli sebagai apa nih?\n\nKetik:\n• *Perusahaan* - Untuk pembelian perusahaan\n• *Individu* - Untuk pembelian pribadi',
    type: 'choice',
    choices: ['perusahaan', 'individu'],
    validation: (value: string) => {
      const normalized = value.toLowerCase().trim();
      return normalized === 'perusahaan' || normalized === 'individu';
    },
    errorMessage: 'Pilih *Perusahaan* atau *Individu* ya! 😊'
  },
  {
    name: 'nama',
    question: 'Boleh tau nama lengkap kamu? 😊',
    validation: (value: string) => value.trim().length >= 3,
    errorMessage: 'Nama minimal 3 huruf ya!'
  },
  {
    name: 'umur',
    question: 'Umur kamu berapa? (angka aja ya)',
    validation: (value: string) => {
      const age = parseInt(value);
      return !isNaN(age) && age >= 17 && age <= 100;
    },
    errorMessage: 'Umur harus angka antara 17-100 tahun ya!'
  },
  {
    name: 'jenisKelamin',
    question: 'Jenis kelamin?\n\nKetik:\n• *L* - Laki-laki\n• *P* - Perempuan',
    type: 'choice',
    choices: ['l', 'p'],
    validation: (value: string) => {
      const normalized = value.toLowerCase().trim();
      return normalized === 'l' || normalized === 'p';
    },
    errorMessage: 'Ketik *L* atau *P* ya! 😊'
  },
  {
    name: 'kota',
    question: 'Kamu ada di kota mana?',
    validation: (value: string) => value.trim().length >= 3,
    errorMessage: 'Nama kota minimal 3 huruf ya!'
  },
  {
    name: 'tujuanPembelian',
    question: 'Tujuan pembeliannya apa nih?\n\nKetik angka:\n1️⃣ - Buat dipakai sendiri (end user)\n2️⃣ - Beli dalam jumlah banyak\n3️⃣ - Beli online\n4️⃣ - Kerjasama bisnis',
    type: 'choice',
    choices: ['1', '2', '3', '4'],
    validation: (value: string) => {
      return ['1', '2', '3', '4'].includes(value.trim());
    },
    errorMessage: 'Ketik angka 1-4 ya! 😊'
  }
];

/**
 * Manager for handling multi-step form sessions
 */
export class FormSessionManager {
  private sessions: Map<string, FormSession> = new Map();
  private readonly SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Start a new form session for user
   */
  startForm(userId: string, formType: string): Message {
    const session: FormSession = {
      userId,
      formType,
      currentStep: 0,
      data: {},
      startedAt: new Date(),
      lastActivityAt: new Date()
    };

    this.sessions.set(userId, session);
    
    // Return first question
    const firstField = this.getFormFields(formType)[0];
    return {
      type: MessageType.TEXT,
      text: `Oke, aku bantuin prosesnya ya! 😊\n\n${firstField.question}`
    };
  }

  /**
   * Check if user has active form session
   */
  hasActiveForm(userId: string): boolean {
    const session = this.sessions.get(userId);
    if (!session) return false;

    // Check timeout
    const now = new Date();
    const elapsed = now.getTime() - session.lastActivityAt.getTime();
    
    if (elapsed > this.SESSION_TIMEOUT_MS) {
      this.sessions.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Process user input for current form step
   */
  processInput(userId: string, input: string): Message {
    const session = this.sessions.get(userId);
    if (!session) {
      return {
        type: MessageType.TEXT,
        text: 'Session kamu udah expired nih 😅\n\nKetik *menu* buat mulai lagi ya!'
      };
    }

    // Check for cancel command
    if (this.isCancelCommand(input)) {
      this.sessions.delete(userId);
      return {
        type: MessageType.TEXT,
        text: 'Oke, form dibatalin ya! 👌\n\nKetik *menu* kalau mau mulai lagi.'
      };
    }

    const fields = this.getFormFields(session.formType);
    const currentField = fields[session.currentStep];

    // Validate input
    if (currentField.validation && !currentField.validation(input)) {
      return {
        type: MessageType.TEXT,
        text: currentField.errorMessage || 'Input ga valid nih, coba lagi ya!'
      };
    }

    // Store data
    session.data[currentField.name] = this.normalizeInput(input, currentField);
    session.lastActivityAt = new Date();

    // Move to next step
    session.currentStep++;

    // Check if form completed
    if (session.currentStep >= fields.length) {
      return this.completeForm(userId);
    }

    // Ask next question
    const nextField = fields[session.currentStep];
    this.sessions.set(userId, session);
    
    return {
      type: MessageType.TEXT,
      text: `Oke! ✅\n\n${nextField.question}`
    };
  }

  /**
   * Complete form and return result
   */
  private completeForm(userId: string): Message {
    const session = this.sessions.get(userId);
    if (!session) {
      return {
        type: MessageType.TEXT,
        text: 'Session error!'
      };
    }

    const data = session.data as PurchaseInquiryData;
    
    // Generate response based on purchase type
    const responseText = this.generateCompletionMessage(data);
    
    // Clean up session
    this.sessions.delete(userId);

    return {
      type: MessageType.TEXT,
      text: responseText
    };
  }

  /**
   * Generate completion message based on collected data
   */
  private generateCompletionMessage(data: PurchaseInquiryData): string {
    const tujuanMap: Record<string, string> = {
      '1': 'end_user',
      '2': 'qty_banyak',
      '3': 'online',
      '4': 'kerjasama_bisnis'
    };

    const tujuan = tujuanMap[data.tujuanPembelian as string] || data.tujuanPembelian;

    let message = `Terima kasih ${data.nama}! 🙏\n\nData kamu udah aku catat:\n`;
    message += `• Tipe: ${data.tipePembeli}\n`;
    message += `• Umur: ${data.umur} tahun\n`;
    message += `• Kota: ${data.kota}\n\n`;

    // Route based on purpose
    if (tujuan === 'online') {
      message += `Untuk pembelian online, kamu bisa langsung ke:\n`;
      message += `🛒 Web: www.example.com/shop\n\n`;
      message += `Atau hubungi CS kami:\n`;
      message += `📞 WhatsApp: +62 812-3456-7890`;
    } else if (tujuan === 'kerjasama_bisnis') {
      message += `Untuk kerjasama bisnis, silakan hubungi:\n`;
      message += `📞 WhatsApp: +62 811-9876-5432\n`;
      message += `📧 Email: partnership@example.com\n\n`;
      message += `Tim kita akan senang diskusi sama kamu! 🤝`;
    } else if (tujuan === 'end_user' && data.tipePembeli === 'individu') {
      message += `Untuk kebutuhan pribadi, hubungi reseller terdekat:\n`;
      message += `📞 WhatsApp: +62 812-3456-7890\n\n`;
      message += `Sebutkan kota kamu (${data.kota}) buat diarahkan ke reseller setempat ya! 😊`;
    } else if (tujuan === 'qty_banyak') {
      message += `Untuk pembelian dalam jumlah banyak, hubungi distributor:\n`;
      message += `📞 WhatsApp: +62 812-3456-7890\n\n`;
      message += `Sebutkan kota kamu (${data.kota}) buat info harga grosir! 💼`;
    } else {
      message += `Silakan hubungi CS kami untuk info lebih lanjut:\n`;
      message += `📞 WhatsApp: +62 812-3456-7890`;
    }

    message += `\n\nTerima kasih! Ketik *menu* kalau butuh info lainnya 😊`;

    return message;
  }

  /**
   * Get form fields by type
   */
  private getFormFields(formType: string): FormField[] {
    if (formType === 'purchase_inquiry') {
      return PURCHASE_INQUIRY_FORM;
    }
    return [];
  }

  /**
   * Check if input is cancel command
   */
  private isCancelCommand(input: string): boolean {
    const normalized = input.toLowerCase().trim();
    return ['batal', 'cancel', 'stop'].includes(normalized);
  }

  /**
   * Normalize input based on field type
   */
  private normalizeInput(input: string, field: FormField): any {
    const trimmed = input.trim();

    if (field.name === 'tipePembeli') {
      return trimmed.toLowerCase();
    }

    if (field.name === 'jenisKelamin') {
      return trimmed.toUpperCase();
    }

    if (field.name === 'umur') {
      return parseInt(trimmed);
    }

    if (field.name === 'tujuanPembelian') {
      return trimmed; // Keep the number for now, will map in completion
    }

    return trimmed;
  }

  /**
   * Cancel form session
   */
  cancelForm(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Get current session info (for debugging)
   */
  getSessionInfo(userId: string): FormSession | undefined {
    return this.sessions.get(userId);
  }

  /**
   * Cleanup expired sessions (can be called periodically)
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [userId, session] of this.sessions.entries()) {
      const elapsed = now.getTime() - session.lastActivityAt.getTime();
      if (elapsed > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(userId);
      }
    }
  }
}
