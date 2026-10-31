import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export type PeriodType = 'annual' | 'semi-annual' | 'quarterly' | 'monthly' | 'other';

interface CardBenefit {
  id: string;
  benefitName: string;
  benefitDetails: string;
  criteriaAction: string;
  completionBy: string;
  remainingBalance2026: string;
  remainingBalance2027: string;
  trackingPeriod: string;
  completed2026: boolean;
  completed2027: boolean;
  notes: string;
  order: number;
  periodType: PeriodType;
  periodChecks: { 2026: boolean[]; 2027: boolean[] };
}

interface CreditCard {
  id: string;
  name: string;
  lastFour: string;
  network: string;
  color: string;
}

interface CardTodo {
  id: string;
  cardID: string;
  content: string;
  isDone: boolean;
}

function inferPeriodType(trackingPeriod: string): PeriodType {
  const t = trackingPeriod.toLowerCase();
  if (t.includes('monthly') || t.includes('month')) return 'monthly';
  if (t.includes('semi') || t.includes('h1') || t.includes('h2')) return 'semi-annual';
  if (t.includes('quarter')) return 'quarterly';
  if (t.includes('annual') || t.includes('annual')) return 'annual';
  return 'other';
}

function periodCount(type: PeriodType): number {
  if (type === 'monthly') return 12;
  if (type === 'semi-annual') return 2;
  if (type === 'quarterly') return 4;
  return 1;
}

function periodLabels(type: PeriodType): string[] {
  if (type === 'monthly') return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (type === 'semi-annual') return ['H1 (Jan–Jun)','H2 (Jul–Dec)'];
  if (type === 'quarterly') return ['Q1','Q2','Q3','Q4'];
  return ['Done'];
}

function emptyChecks(type: PeriodType): boolean[] {
  return Array(periodCount(type)).fill(false);
}

const BENEFIT_TOOLTIPS: Record<string, string> = {
  'Uber Cash': '$200 Uber Cash: Receive $15 in Uber Cash each month, plus a bonus $20 in December when you add the Platinum Card to your Uber account for rides and orders in the U.S. Select an Amex Card for your transaction to qualify.',
  'Uber One Credit': '$120 Uber One Credit: When you use the Platinum Card to pay for an auto-renewing Uber One membership, you can get up to $120 in statement credits each calendar year.',
  'Airline Fee Credit': '$200 Airline Fee Credit: Select one qualifying airline and receive up to $200 in statement credits per calendar year when incidental fees such as checked bags and in-flight refreshments are charged by the airline to the Platinum Card Account. Qualifying airlines are subject to change.',
  'CLEAR+ Credit': '$219 CLEAR+ Credit: CLEAR is a digital identity verification company that uses your face to help members move faster through security at select airports, stadiums, and entertainment venues nationwide. Cover the cost of a CLEAR+ Membership with up to $219 in statement credits per calendar year after you pay for CLEAR+ with the Platinum Card. Subject to auto-renewal.',
  'Hotel Credit': '$600 Hotel Credit: Get up to $300 in statement credits semi-annually (up to $600/yr total) on prepaid Fine Hotels + Resorts or The Hotel Collection bookings through American Express Travel using your Platinum Card. The Hotel Collection requires a minimum two-night stay. Effective January 1, 2027, Fine Hotels + Resorts bookings will also require a minimum two-night stay.',
  'Resy Credit': '$400 Resy Credit: Find and book reservations on Resy. When you use the Platinum Card to dine at over 10,000 qualifying U.S. Resy restaurants or make other eligible Resy purchases, you can get up to $100 in statement credits each quarter. Enrollment required.',
  'Digital Entertainment Credit': '$300 Digital Entertainment Credit: Get up to $25 in statement credits each month when you use the Platinum Card for eligible purchases on Disney+, a Disney+ bundle, ESPN streaming services, Hulu, The New York Times, Paramount+, Peacock, The Wall Street Journal, YouTube Premium, and YouTube TV when purchased directly from the providers. Enrollment required.',
  'lululemon Credit': '$300 lululemon Credit: Get up to $75 in statement credits each quarter when you use the Platinum Card for eligible purchases at U.S. lululemon retail stores (excluding outlets) and lululemon.com. Enrollment required.',
  'Walmart+ Credit': '$155 Walmart+ Credit: Get up to $12.95 statement credit back each month after you pay for a monthly Walmart+ membership (subject to auto-renewal) with the Platinum Card. Up to $12.95 plus applicable taxes on one membership fee.',
  'Oura Ring Credit': '$200 Oura Ring Credit: Track your sleep, activity, and more with Oura Ring. Receive up to $200 in statement credits when you use the Platinum Card to purchase an Oura Ring at ouraring.com each calendar year. Enrollment required.',
  'Global Lounge Access': 'American Express Global Lounge Collection: Access to 1,550+ airport lounges — more than any other credit card company. Includes: Unlimited Centurion Lounge access (must arrive within 3 hours of departing flight), 10 Delta Sky Club visits per year (Feb 1 – Jan 31), unlimited Priority Pass visits (enrollment required), and Escape Lounges. Spend $75,000/yr to unlock unlimited Delta Sky Club access and complimentary guest access for up to 2 guests.',
  'Fine Hotels + Resorts': 'Fine Hotels + Resorts Program: Book at 1,900+ FHR properties through Amex Travel to unlock complimentary benefits averaging $550 value per stay including: daily breakfast for two, room upgrade upon arrival when available, $100 credit towards eligible charges, guaranteed 4PM late checkout, and 12PM check-in when available. Earn 5X Membership Rewards points on prepaid stays.',
  '5X Points – Flights & Hotels': '5X Membership Rewards Points: Earn 5X points per dollar on up to $500,000 per calendar year on flights purchased through American Express Travel or directly from airlines. Also earn 5X points on eligible prepaid hotel bookings made through American Express Travel.',
};

const DEFAULT_BENEFITS = [
  { benefitName: 'Uber Cash', benefitDetails: '$15/month + $20 in Dec = $200/yr', criteriaAction: 'Add Platinum Card to Uber account, select Amex for transaction', completionBy: 'Monthly (Dec bonus)', remainingBalance2026: '$200', remainingBalance2027: '$200', trackingPeriod: 'Monthly – $15 Jan-Nov, $20 Dec', notes: '' },
  { benefitName: 'Uber One Credit', benefitDetails: 'Up to $120/yr in statement credits', criteriaAction: 'Pay for Uber One membership with Platinum Card', completionBy: 'Annual', remainingBalance2026: '$120', remainingBalance2027: '$120', trackingPeriod: 'Annual', notes: '' },
  { benefitName: 'Airline Fee Credit', benefitDetails: 'Up to $200/yr on incidental fees', criteriaAction: 'Select one qualifying airline; use card for incidental fees', completionBy: 'Dec 31', remainingBalance2026: '$200', remainingBalance2027: '$200', trackingPeriod: 'Annual', notes: '' },
  { benefitName: 'CLEAR+ Credit', benefitDetails: 'Up to $219/yr', criteriaAction: 'Pay for CLEAR+ membership with Platinum Card', completionBy: 'Annual', remainingBalance2026: '$219', remainingBalance2027: '$219', trackingPeriod: 'Annual', notes: '' },
  { benefitName: 'Hotel Credit', benefitDetails: 'Up to $600/yr ($300 semi-annually)', criteriaAction: 'Book prepaid FHR or Hotel Collection via Amex Travel', completionBy: 'Jun 30 & Dec 31', remainingBalance2026: '$600', remainingBalance2027: '$600', trackingPeriod: 'Semi-annual – $300 H1, $300 H2', notes: '' },
  { benefitName: 'Resy Credit', benefitDetails: 'Up to $400/yr ($100/quarter)', criteriaAction: 'Dine at qualifying Resy restaurants; enrollment required', completionBy: 'End of each quarter', remainingBalance2026: '$400', remainingBalance2027: '$400', trackingPeriod: 'Quarterly – $100 per quarter', notes: '' },
  { benefitName: 'Digital Entertainment Credit', benefitDetails: 'Up to $300/yr ($25/month)', criteriaAction: 'Use card on Disney+, Hulu, NYT, Peacock, WSJ, YouTube etc; enrollment required', completionBy: 'Monthly', remainingBalance2026: '$300', remainingBalance2027: '$300', trackingPeriod: 'Monthly – $25/month', notes: '' },
  { benefitName: 'lululemon Credit', benefitDetails: 'Up to $300/yr ($75/quarter)', criteriaAction: 'Purchase at U.S. lululemon stores or lululemon.com; enrollment required', completionBy: 'End of each quarter', remainingBalance2026: '$300', remainingBalance2027: '$300', trackingPeriod: 'Quarterly – $75 per quarter', notes: '' },
  { benefitName: 'Walmart+ Credit', benefitDetails: 'Up to $155/yr (~$12.95/month)', criteriaAction: 'Pay for monthly Walmart+ membership with Platinum Card', completionBy: 'Monthly', remainingBalance2026: '$155', remainingBalance2027: '$155', trackingPeriod: 'Monthly – $12.95/month', notes: '' },
  { benefitName: 'Oura Ring Credit', benefitDetails: 'Up to $200/yr', criteriaAction: 'Purchase Oura Ring at ouraring.com; enrollment required', completionBy: 'Annual', remainingBalance2026: '$200', remainingBalance2027: '$200', trackingPeriod: 'Annual', notes: '' },
  { benefitName: 'Global Lounge Access', benefitDetails: 'Centurion, Priority Pass (unlimited), Delta Sky Club (10 visits)', criteriaAction: 'Present valid card + same-day boarding pass', completionBy: 'Delta visits: Jan 31', remainingBalance2026: '10 Delta visits', remainingBalance2027: '10 Delta visits', trackingPeriod: 'Annual', notes: '' },
  { benefitName: 'Fine Hotels + Resorts', benefitDetails: 'Avg $550 value/stay – breakfast, upgrade, $100 credit, late checkout', criteriaAction: 'Book via Amex Travel', completionBy: 'Per stay', remainingBalance2026: 'Unlimited', remainingBalance2027: 'Unlimited', trackingPeriod: 'Annual', notes: '' },
  { benefitName: '5X Points – Flights & Hotels', benefitDetails: '5X points on flights (up to $500K/yr) and prepaid hotels via Amex Travel', criteriaAction: 'Book flights directly or via Amex Travel; prepaid hotels via Amex Travel', completionBy: 'Annual', remainingBalance2026: 'Up to $500K spend', remainingBalance2027: 'Up to $500K spend', trackingPeriod: 'Annual', notes: '' },
];

@Component({
  selector: 'app-card-benefits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './card-benefits.component.html',
  styleUrl: './card-benefits.component.css'
})
export class CardBenefitsComponent implements OnInit {
  benefits: CardBenefit[] = [];
  editingId: string | null = null;
  editingBenefit: CardBenefit | null = null;
  selectedYear: 2026 | 2027 = 2026;
  isLoading = false;
  loadError = '';

  // Card management
  cards: CreditCard[] = [];
  allTodos: CardTodo[] = [];
  selectedCardId: string | null = null;
  newCard = { name: '', lastFour: '', network: '', color: '#1565c0' };
  newTodoContent = '';
  editingTodoId: string | null = null;
  editingTodoContent = '';

  async ngOnInit() {
    await Promise.all([this.loadBenefits(), this.loadCards()]);
  }

  parseBenefit(b: any): CardBenefit {
    const periodType = inferPeriodType(b.trackingPeriod || '');
    let periodChecks: { 2026: boolean[]; 2027: boolean[] } = {
      2026: emptyChecks(periodType),
      2027: emptyChecks(periodType)
    };
    if (b.periodChecks) {
      try {
        const parsed = JSON.parse(b.periodChecks);
        if (parsed[2026]) periodChecks[2026] = parsed[2026];
        if (parsed[2027]) periodChecks[2027] = parsed[2027];
      } catch {}
    }
    return {
      id: b.id,
      benefitName: b.benefitName || '',
      benefitDetails: b.benefitDetails || '',
      criteriaAction: b.criteriaAction || '',
      completionBy: b.completionBy || '',
      remainingBalance2026: b.remainingBalance2026 || '',
      remainingBalance2027: b.remainingBalance2027 || '',
      trackingPeriod: b.trackingPeriod || '',
      completed2026: b.completed2026 || false,
      completed2027: b.completed2027 || false,
      notes: b.notes || '',
      order: b.order ?? 0,
      periodType,
      periodChecks,
    };
  }

  async loadBenefits() {
    this.isLoading = true;
    try {
      const { data, errors } = await client.models.CardBenefit.list();
      if (errors && errors.length > 0) {
        this.loadError = 'Schema not deployed yet. Run: npx amplify sandbox';
        this.isLoading = false;
        return;
      }
      if (data.length === 0) {
        await this.seedDefaults();
      } else {
        this.benefits = data
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(b => this.parseBenefit(b));
      }
    } catch (e: any) {
      this.loadError = e?.message || 'Error loading. Schema may not be deployed.';
    }
    this.isLoading = false;
  }

  async seedDefaults() {
    for (let i = 0; i < DEFAULT_BENEFITS.length; i++) {
      const pt = inferPeriodType(DEFAULT_BENEFITS[i].trackingPeriod);
      const periodChecks = JSON.stringify({ 2026: emptyChecks(pt), 2027: emptyChecks(pt) });
      await client.models.CardBenefit.create({ ...DEFAULT_BENEFITS[i], completed2026: false, completed2027: false, order: i, periodChecks });
    }
    await this.loadBenefits();
  }

  getPeriodLabels(benefit: CardBenefit): string[] {
    return periodLabels(benefit.periodType);
  }

  async togglePeriodCheck(benefit: CardBenefit, index: number) {
    benefit.periodChecks[this.selectedYear][index] = !benefit.periodChecks[this.selectedYear][index];
    // Auto-set overall completed if all periods checked
    const allDone = benefit.periodChecks[this.selectedYear].every(v => v);
    if (this.selectedYear === 2026) benefit.completed2026 = allDone;
    else benefit.completed2027 = allDone;

    await client.models.CardBenefit.update({
      id: benefit.id,
      periodChecks: JSON.stringify(benefit.periodChecks),
      completed2026: benefit.completed2026,
      completed2027: benefit.completed2027,
    });
  }

  startEdit(benefit: CardBenefit) {
    this.editingId = benefit.id;
    this.editingBenefit = { ...benefit, periodChecks: JSON.parse(JSON.stringify(benefit.periodChecks)) };
  }

  cancelEdit() {
    this.editingId = null;
    this.editingBenefit = null;
  }

  async saveEdit() {
    if (!this.editingBenefit) return;
    try {
      await client.models.CardBenefit.update({
        id: this.editingBenefit.id,
        benefitName: this.editingBenefit.benefitName,
        benefitDetails: this.editingBenefit.benefitDetails,
        criteriaAction: this.editingBenefit.criteriaAction,
        completionBy: this.editingBenefit.completionBy,
        remainingBalance2026: this.editingBenefit.remainingBalance2026,
        remainingBalance2027: this.editingBenefit.remainingBalance2027,
        trackingPeriod: this.editingBenefit.trackingPeriod,
        notes: this.editingBenefit.notes,
      });
      this.editingId = null;
      this.editingBenefit = null;
      await this.loadBenefits();
    } catch (e) {
      console.error('Error saving benefit:', e);
    }
  }

  async toggleCompleted(benefit: CardBenefit, year: 2026 | 2027) {
    const update: any = { id: benefit.id };
    if (year === 2026) update.completed2026 = !benefit.completed2026;
    else update.completed2027 = !benefit.completed2027;
    await client.models.CardBenefit.update(update);
    await this.loadBenefits();
  }

  get completedCount(): number {
    return this.benefits.filter(b => this.selectedYear === 2026 ? b.completed2026 : b.completed2027).length;
  }

  getTooltip(benefitName: string): string {
    return BENEFIT_TOOLTIPS[benefitName] || '';
  }

  // ---- Card management ----
  async loadCards() {
    try {
      const { data } = await client.models.CreditCard.list();
      this.cards = data.map(c => ({ id: c.id, name: c.name || '', lastFour: c.lastFour || '', network: c.network || '', color: c.color || '#1565c0' }));
      const { data: todos } = await client.models.CardTodo.list();
      this.allTodos = todos.map(t => ({ id: t.id, cardID: t.cardID || '', content: t.content || '', isDone: t.isDone || false }));
    } catch (e) { console.error(e); }
  }

  async addCard() {
    if (!this.newCard.name.trim()) return;
    await client.models.CreditCard.create({ ...this.newCard });
    this.newCard = { name: '', lastFour: '', network: '', color: '#1565c0' };
    await this.loadCards();
  }

  async deleteCard(id: string) {
    const todos = this.allTodos.filter(t => t.cardID === id);
    for (const t of todos) await client.models.CardTodo.delete({ id: t.id });
    await client.models.CreditCard.delete({ id });
    if (this.selectedCardId === id) this.selectedCardId = null;
    await this.loadCards();
  }

  selectCard(id: string) { this.selectedCardId = id; }

  getCardName(id: string): string {
    return this.cards.find(c => c.id === id)?.name || '';
  }

  get selectedCardTodos(): CardTodo[] {
    return this.allTodos.filter(t => t.cardID === this.selectedCardId);
  }

  getTodoCount(cardId: string): string {
    const all = this.allTodos.filter(t => t.cardID === cardId);
    const done = all.filter(t => t.isDone).length;
    return `${done}/${all.length}`;
  }

  async addTodo() {
    if (!this.newTodoContent.trim() || !this.selectedCardId) return;
    await client.models.CardTodo.create({ cardID: this.selectedCardId, content: this.newTodoContent, isDone: false });
    this.newTodoContent = '';
    await this.loadCards();
  }

  async toggleTodo(todo: CardTodo) {
    await client.models.CardTodo.update({ id: todo.id, isDone: !todo.isDone });
    await this.loadCards();
  }

  startEditTodo(todo: CardTodo) {
    this.editingTodoId = todo.id;
    this.editingTodoContent = todo.content;
  }

  async saveTodo(todo: CardTodo) {
    if (!this.editingTodoContent.trim()) return;
    await client.models.CardTodo.update({ id: todo.id, content: this.editingTodoContent });
    this.editingTodoId = null;
    this.editingTodoContent = '';
    await this.loadCards();
  }

  async deleteTodo(id: string) {
    await client.models.CardTodo.delete({ id });
    await this.loadCards();
  }
}
