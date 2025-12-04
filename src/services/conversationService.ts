import * as fs from 'fs';
import * as path from 'path';
import { ConversationTree, ConversationState, Message, MessageType, ProductType } from '../types';
import { FormSessionManager } from './formSessionManager';
import { FAQManager } from './faqManager';
import { getFAQById, getFAQByQuestion } from '../data/faqData';

/**
 * Service for managing conversation flow based on conversation tree
 */
export class ConversationService {
  private tree: ConversationTree;
  private userStates: Map<string, string> = new Map();
  private formSessionManager: FormSessionManager;
  private faqManager: FAQManager;

  constructor() {
    this.tree = this.loadConversationTree();
    this.formSessionManager = new FormSessionManager();
    this.faqManager = new FAQManager();
    
    // Cleanup expired form sessions every 5 minutes
    setInterval(() => {
      this.formSessionManager.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Load conversation tree from JSON file
   */
  private loadConversationTree(): ConversationTree {
    try {
      const filePath = path.join(process.cwd(), 'conversation-tree.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load conversation tree:', error);
      throw new Error('Cannot initialize conversation service');
    }
  }

  /**
   * Process user input and get response message
   */
  processInput(userId: string, userInput: string): Message {
    // Check if user has active form session first
    if (this.formSessionManager.hasActiveForm(userId)) {
      return this.formSessionManager.processInput(userId, userInput);
    }

    const normalizedInput = this.normalizeInput(userInput);
    
    // Check for form start trigger
    if (normalizedInput === 'bisnis_form_start' || this.isFormStartState(normalizedInput)) {
      return this.formSessionManager.startForm(userId, 'purchase_inquiry');
    }
    
    // Check global keywords first
    const keywordState = this.checkKeyword(normalizedInput);
    if (keywordState) {
      this.userStates.set(userId, keywordState);
      return this.convertStateToMessage(keywordState);
    }

    // Get current state and check for transitions
    const currentStateKey = this.getCurrentStateKey(userId);
    const currentState = this.tree.states[currentStateKey];

    // Check if user selected an FAQ question - handle dynamically
    // WhatsApp sends the title text, not the ID, so check by question text
    let faq = getFAQByQuestion(normalizedInput);
    let faqId: string | undefined;
    
    // If not found by question, try by ID (for backwards compatibility)
    if (!faq && normalizedInput.startsWith('faq_')) {
      faq = getFAQById(normalizedInput);
      faqId = normalizedInput;
    } else if (faq) {
      faqId = faq.id;
    }
    
    if (faq && faqId) {
      // Mark FAQ as asked
      const product = this.getProductFromFAQId(faqId);
      if (product) {
        this.faqManager.markAsAsked(userId, product, faqId);
        
        // Get 3 more random FAQs for the same product
        const moreFAQs = this.faqManager.getRandomFAQs(userId, product, 3);
        
        const rows = [
          ...moreFAQs.map(f => ({
            id: f.id,
            title: f.question.length > 24 ? f.question.substring(0, 24) : f.question,
            description: f.question
          })),
          {
            id: 'kembali',
            title: 'Kembali',
            description: 'Kembali ke menu sebelumnya'
          },
          {
            id: 'menu_utama',
            title: 'Ke Menu Utama',
            description: 'Kembali ke menu utama'
          }
        ];
        
        // Return FAQ answer as LIST with more FAQ options
        return {
          type: MessageType.LIST,
          interactive: {
            body: faq.answer + '\n\nAda pertanyaan lain?',
            lists: {
              button: 'Lihat FAQ',
              sections: [{
                title: 'Pertanyaan Lainnya',
                rows
              }]
            }
          }
        };
      }
    }

    // Check exact match
    if (currentState.transitions[normalizedInput]) {
      const nextStateKey = currentState.transitions[normalizedInput];
      
      // Check if next state is form trigger
      if (nextStateKey === 'bisnis_form_start') {
        return this.formSessionManager.startForm(userId, 'purchase_inquiry');
      }
      
      // Check if this is an FAQ answer state - mark FAQ as asked
      if (normalizedInput.startsWith('faq_')) {
        const product = this.getProductFromFAQId(normalizedInput);
        if (product) {
          this.faqManager.markAsAsked(userId, product, normalizedInput);
        }
      }
      
      this.userStates.set(userId, nextStateKey);
      
      // Check if user selected an FAQ question - return answer with navigation
      if (normalizedInput.startsWith('faq_')) {
        const faq = getFAQById(normalizedInput);
        if (faq) {
          const prevState = this.getCurrentStateKey(userId);
          const backState = prevState || 'greeting'; // Go back to previous state
          
          return {
            type: MessageType.BUTTON,
            interactive: {
              body: faq.answer,
              buttons: [
                { id: 'kembali', title: 'Kembali' },
                { id: 'menu_utama', title: 'Ke Menu Utama' }
              ]
            }
          };
        }
      }
      
      // Check if this is an FAQ state - generate dynamic FAQ list
      const faqState = this.getFAQStateInfo(nextStateKey);
      if (faqState) {
        return this.generateFAQListMessage(userId, nextStateKey, faqState.product, faqState.content);
      }
      
      return this.convertStateToMessage(nextStateKey);
    }

    // Check partial match
    const partialMatch = this.findPartialMatch(normalizedInput, currentState.transitions);
    if (partialMatch) {
      // Check if matched state is form trigger
      if (partialMatch === 'bisnis_form_start') {
        return this.formSessionManager.startForm(userId, 'purchase_inquiry');
      }
      
      this.userStates.set(userId, partialMatch);
      return this.convertStateToMessage(partialMatch);
    }

    // Use fallback or return to current state
    const fallbackStateKey = currentState.fallback || currentStateKey;
    return this.convertStateToMessage(fallbackStateKey);
  }

  /**
   * Reset user conversation state
   */
  reset(userId: string): void {
    this.userStates.delete(userId);
  }

  /**
   * Get conversation tree info
   */
  getInfo(): { version: string; description: string; totalStates: number } {
    return {
      version: this.tree.version,
      description: this.tree.description,
      totalStates: Object.keys(this.tree.states).length
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Normalize user input for matching
   */
  private normalizeInput(input: string): string {
    // Extract first line only (for list responses with descriptions)
    const firstLine = input.split('\n')[0];
    return firstLine.toLowerCase().trim();
  }

  /**
   * Get current state key for user
   */
  private getCurrentStateKey(userId: string): string {
    return this.userStates.get(userId) || this.tree.initial_state;
  }

  /**
   * Check if input matches any global keyword
   */
  private checkKeyword(input: string): string | null {
    return this.tree.keywords[input] || null;
  }

  /**
   * Find partial match in transitions
   */
  private findPartialMatch(input: string, transitions: Record<string, string>): string | null {
    for (const [key, stateKey] of Object.entries(transitions)) {
      if (input.includes(key) || key.includes(input)) {
        return stateKey;
      }
    }
    return null;
  }

  /**
   * Check if state key is form start trigger
   */
  private isFormStartState(stateKey: string): boolean {
    return stateKey === 'bisnis_form_start';
  }

  /**
   * Convert conversation state to message format
   */
  private convertStateToMessage(stateKey: string): Message {
    const state = this.tree.states[stateKey];

    if (!state) {
      // Return error fallback if state not found
      return {
        type: MessageType.TEXT,
        text: this.tree.fallback_responses.error
      };
    }

    // Check if this is an FAQ-enabled state - needs userId for dynamic generation
    // For now, we'll handle FAQ states in a separate method
    // This is called from processInput where we have userId

    switch (state.type) {
      case 'text':
        return {
          type: MessageType.TEXT,
          text: state.message.text || state.message
        };

      case 'interactive_button':
        return {
          type: MessageType.BUTTON,
          interactive: state.message
        };

      case 'interactive_list':
        return {
          type: MessageType.LIST,
          interactive: state.message
        };

      default:
        console.error('Unknown state type:', state.type);
        return {
          type: MessageType.TEXT,
           text: this.tree.fallback_responses.error
         };
     }
   }

   /**
    * Check if state is FAQ-enabled and return its info
    */
   private getFAQStateInfo(stateKey: string): { product: ProductType; content: string } | null {
     // Map of FAQ states
     const faqStates: Record<string, { product: ProductType; content: string }> = {
       'silverstream_penjelasan': {
         product: 'silverstream',
         content: 'Jadi gini, SilverStream itu cairan perawatan luka yang multifungsi banget! ✨\n\nFungsinya:\n• Bersihin luka\n• Melembapkan\n• Kurangin risiko infeksi\n• Hilangin bau ga enak\n• Percepat penyembuhan\n\nCocok buat berbagai jenis luka:\n- Luka operasi\n- Luka diabetes\n- Luka bakar ringan\n- Luka tekan\n- Luka kronis lainnya\n\nRahasianya? Kandungan ion perak yang bantu menenangkan dan dukung pertumbuhan jaringan baru 🌟'
       },
       'silverstream_cara_penggunaan': {
         product: 'silverstream',
         content: 'Gampang kok cara pakainya! 😊\n\n1️⃣ Semprot/tetesin SilverStream ke area luka\n\n2️⃣ Diamkan 5-10 menit (ga perlu dibilas ya!)\n\n3️⃣ Basahin kasa steril pake SilverStream, terus tempel di luka\n\n4️⃣ Tutup pake balutan kering\n\n5️⃣ Ulangi 1-2x sehari atau sesuai saran dokter\n\nPenting: Selalu ikuti anjuran tenaga medis kamu ya! 💙'
       },
       'stimel_penjelasan': {
         product: 'stimel',
         content: 'Stimel-03 ini teknologi rehabilitasi yang canggih banget! 🔬⚡\n\nBayangkan: Alat yang bisa baca sinyal otot kamu secara real-time, terus langsung sesuaikan stimulasi listriknya. Keren kan?\n\nKombinasi:\n• FES/NMES (stimulasi listrik)\n• EMG biofeedback (baca sinyal otot)\n\nHasilnya?\n✓ Pemulihan lebih cepat\n✓ Neuroplastisitas meningkat\n✓ Pasien jadi lebih aktif pas terapi\n\nJadi gak cuma pasif, tapi pasien ikut berperan aktif dalam pemulihan! 💪'
       },
       'stimel_cara_penggunaan': {
         product: 'stimel',
         content: 'Cara pakainya gampang kok, dipandu terapis tentunya! 👨‍⚕️\n\n1️⃣ Pasang elektroda di area otot yang mau direhabilitasi\n\n2️⃣ Terapis pilih mode:\n   • NMES standar\n   • Biofeedback adaptif\n\n3️⃣ Perangkat baca sinyal EMG kamu → tampil di layar → berikan stimulasi yang pas\n\n4️⃣ Dipakai pas sesi rehabilitasi rutin\n\n5️⃣ Terapis monitor terus buat adjust intensitas & target\n\nJadi semua terukur dan terpantau dengan baik! 📊'
       },
       'akusehat_penjelasan': {
         product: 'akusehat',
         content: 'AkuSehat.AI ini keren lho! 🤖✨\n\nBayangkan aja, cukup pake kamera smartphone kamu bisa cek:\n• Tekanan darah\n• Detak jantung\n• Saturasi oksigen\n• Level stres\n• Skor kebugaran\n\nSemua tanpa alat medis fisik! Teknologi AI yang ngukur biomarker tubuh kamu cuma lewat video scan wajah.\n\nCanggih kan? 📱💙'
       },
       'akusehat_cara_download': {
         product: 'akusehat',
         content: 'Jadi gini, AkuSehat.AI belum tersedia bebas di app store ya 📱\n\nAkses platformnya lewat:\n• Rumah sakit/klinik partner\n• Institusi yang kerjasama dengan AkuSehat.AI\n\nKamu bisa dapet akses melalui fasilitas kesehatan yang udah jadi mitra.\n\nMau tau institusi mana aja yang udah kerjasama? Kontak kami yuk! 💬'
       },
       'akusehat_cara_penggunaan': {
         product: 'akusehat',
         content: 'Cara pakainya simple banget! 😊\n\n1️⃣ Daftar dulu dengan data dasar:\n   • Nama, email, telepon\n   • Tinggi & berat badan\n\n2️⃣ Buka platform dan siap-siap scan wajah\n\n3️⃣ Arahkan kamera ke wajah kamu\n\n4️⃣ AI akan analisis video scan-nya\n\n5️⃣ Tadaaa! Hasil biomarker & skor kesehatan kamu langsung muncul 📊\n\nPraktis kan? Semua lewat kamera aja! 📱✨'
       }
     };

     return faqStates[stateKey] || null;
   }

   /**
    * Extract product type from FAQ ID
    */
   private getProductFromFAQId(faqId: string): ProductType | null {
     if (faqId.startsWith('faq_ss_')) return 'silverstream';
     if (faqId.startsWith('faq_st_')) return 'stimel';
     if (faqId.startsWith('faq_as_')) return 'akusehat';
     return null;
   }

   /**
    * Get FAQManager instance (for testing/debugging)
    */
   getFAQManager(): FAQManager {
     return this.faqManager;
   }

   /**
    * Generate dynamic FAQ list message
    * Used for states that have FAQ questions
    */
   generateFAQListMessage(userId: string, stateKey: string, product: ProductType, baseContent: string): Message {
     const faqs = this.faqManager.getRandomFAQs(userId, product, 3);
     
    const rows = [
      ...faqs.map(faq => ({
        id: faq.id,
        title: faq.question.length > 24 ? faq.question.substring(0, 24) : faq.question,
        description: faq.question
      })),
      {
        id: 'kembali',
        title: 'Kembali',
        description: 'Kembali ke menu sebelumnya'
      },
      {
        id: 'menu_utama',
        title: 'Ke Menu Utama',
        description: 'Kembali ke menu utama'
      }
    ];

     return {
       type: MessageType.LIST,
       interactive: {
         body: baseContent + '\n\nAda pertanyaan lain?',
         lists: {
           button: 'Lihat FAQ',
           sections: [{
             title: 'Pertanyaan Lainnya',
             rows
           }]
         }
       }
     };
   }
 }
