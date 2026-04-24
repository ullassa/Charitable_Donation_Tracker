import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  contactOpen = false;
  contactSubmitted = false;
  contactForm = { email: '', reason: '' };
  faqOpen = false;
  helpChatOpen = false;
  helpInput = '';
  helpMessages: Array<{ role: 'bot' | 'user'; text: string }> = [
    {
      role: 'bot',
      text: 'Hi, I am CareFund help assistant.\nTry asking about donation steps, receipt PDF, login reset, charity approval, dashboard reports, or profile rules.'
    }
  ];
  quickHelpSuggestions: string[] = [
    'How do I donate?',
    'How to download receipt PDF?',
    'Why is my charity status pending?',
    'What does account on hold mean?',
    'How to reset password?',
    'Can I donate anonymously?'
  ];

  private readonly helpIntents: Array<{ keywords: string[]; reply: string }> = [
    {
      keywords: ['hi', 'hello', 'hey', 'good morning', 'good evening'],
      reply: 'Hi! I can help with donation, payment, receipts, login, charity approval, dashboard, and profile updates.'
    },
    {
      keywords: ['donate', 'donation', 'how to donate', 'pay', 'payment'],
      reply: 'To donate: open the Donate page, choose a charity, select the amount, and complete payment.\nAfter success, the receipt is available in Donor Dashboard and is also emailed to you.'
    },
    {
      keywords: ['anonymous', 'hide my identity', 'hide identity'],
      reply: 'Yes. Enable anonymous donation in the payment section.\nYour name will be hidden from charity-facing donation views while still keeping your receipt for your own records.'
    },
    {
      keywords: ['receipt', 'pdf', 'download receipt', 'invoice'],
      reply: 'Go to Donor Dashboard → Recent Donations → click the receipt icon.\nIf the PDF looks blank, refresh and download again; if it still fails, share the donation ID so it can be checked.'
    },
    {
      keywords: ['login', 'sign in', 'cannot login', 'forgot password', 'reset password', 'password reset'],
      reply: 'Use the Login page to sign in.\nIf you forgot your password, open Forgot Password and complete OTP verification to reset securely.'
    },
    {
      keywords: ['register', 'signup', 'sign up', 'create account', 'donor account', 'customer account'],
      reply: 'Use Customer Signup to create a donor account.\nComplete email and phone OTP verification, then set a strong password to proceed.'
    },
    {
      keywords: ['charity signup', 'charity registration', 'register charity', 'charity apply'],
      reply: 'Use Charity Signup, fill in organization and manager details, upload images, and submit.\nStatus appears as Pending, Approved, Rejected, or Hold after admin review.'
    },
    {
      keywords: ['pending', 'approved', 'rejected', 'hold', 'under review', 'status'],
      reply: 'Charity status flow: Pending means under review, Approved enables the dashboard, and Rejected or Hold blocks access with an admin comment.'
    },
    {
      keywords: ['dashboard', 'chart', 'analytics', 'recent donation', 'trend'],
      reply: 'Dashboards show donation trends, totals, and recent records.\nThe charity dashboard also shows target progress and donor/payment details.'
    },
    {
      keywords: ['profile', 'edit profile', 'update profile', 'name', 'address'],
      reply: 'Profile permissions: donors can edit name and address or city only.\nCharity profile is read-only on the profile page under the current rules.'
    },
    {
      keywords: ['faq', 'help', 'support', 'contact', 'email', 'phone'],
      reply: 'Open FAQ from the footer for quick answers, or use Contact Us to submit your issue.\nFor registration support, email carefund03@gmail.com.'
    },
    {
      keywords: ['thanks', 'thank you', 'ok', 'great'],
      reply: 'Happy to help. If you share the exact issue text, I can guide you step-by-step.'
    }
  ];

  quickLinks = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about' },
  ];

  faqs = [
    {
      question: 'How do I donate to a charity?',
      answer: 'Go to Donate, select a charity, choose amount, and complete payment.'
    },
    {
      question: 'Can I donate anonymously?',
      answer: 'Yes. Use the anonymous toggle in payment options to hide your identity from charity view.'
    },
    {
      question: 'How do I download donation receipt PDF?',
      answer: 'Open Donor Dashboard and click Receipt PDF next to the donation.'
    },
    {
      question: 'How does charity approval work?',
      answer: 'Admin reviews submitted documents and profile details before approving.'
    }
  ];

  legalLinks = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
  ];

  socialLinks = [
    { label: 'Facebook', icon: 'FB', url: 'https://facebook.com' },
    { label: 'Twitter', icon: 'X', url: 'https://twitter.com' },
    { label: 'LinkedIn', icon: 'IN', url: 'https://linkedin.com' },
    { label: 'Instagram', icon: 'IG', url: 'https://instagram.com' },
  ];

  openContact(): void {
    this.contactSubmitted = false;
    this.contactOpen = true;
  }

  closeContact(): void {
    this.contactOpen = false;
  }

  openFaq(): void {
    this.faqOpen = true;
  }

  closeFaq(): void {
    this.faqOpen = false;
  }

  toggleHelpChat(): void {
    this.helpChatOpen = !this.helpChatOpen;
  }

  sendHelpMessage(): void {
    const input = this.helpInput.trim();
    if (!input) {
      return;
    }

    this.pushHelpExchange(input);
    this.helpInput = '';
  }

  sendQuickHelpMessage(message: string): void {
    const value = (message || '').trim();
    if (!value) {
      return;
    }

    this.pushHelpExchange(value);
  }

  private pushHelpExchange(input: string): void {
    this.helpMessages.push({ role: 'user', text: input });
    const reply = this.getHelpReply(input);
    this.helpMessages.push({ role: 'bot', text: reply });
  }

  private getHelpReply(input: string): string {
    const normalized = this.normalizeText(input);

    const scored = this.helpIntents
      .map(intent => ({
        intent,
        score: intent.keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return scored[0].intent.reply;
    }

    const faqMatch = this.faqs.find(item => {
      const q = this.normalizeText(item.question);
      return this.sharedWordCount(normalized, q) >= 2;
    });

    if (faqMatch) {
      return `${faqMatch.answer}\n\nIf you want, I can also explain the exact steps one by one.`;
    }

    return 'I could not fully map that yet.\nTry one of these: donation steps, anonymous donation, receipt PDF, login or password reset, charity registration status, dashboard data, or profile update rules.';
  }

  private normalizeText(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sharedWordCount(source: string, target: string): number {
    const src = new Set(source.split(' ').filter(Boolean));
    const tgt = new Set(target.split(' ').filter(Boolean));
    let count = 0;
    src.forEach(word => {
      if (tgt.has(word)) {
        count++;
      }
    });
    return count;
  }

  submitContact(): void {
    if (!this.contactForm.email.trim() || !this.contactForm.reason.trim()) {
      return;
    }

    this.contactSubmitted = true;
    this.contactForm = { email: '', reason: '' };
  }
}
