import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TourService } from './tour.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tour',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isActive" class="tour-overlay">
      <div *ngIf="currentStep >= 0" class="tour-tooltip" [ngClass]="'tour-' + currentStepData?.position">
        <div class="tour-arrow" [ngClass]="'arrow-' + currentStepData?.position"></div>
        <div class="tour-header">
          <h3>{{ currentStepData?.title }}</h3>
          <span class="tour-step">{{ currentStep + 1 }} / {{ totalSteps }}</span>
        </div>
        <p>{{ currentStepData?.content }}</p>
        <div class="tour-actions">
          <button (click)="skipTour()" class="tour-btn tour-skip">Skip Tour</button>
          <button (click)="previousStep()" class="tour-btn tour-prev" [disabled]="currentStep === 0">Previous</button>
          <button (click)="nextStep()" class="tour-btn tour-next">
            {{ currentStep === totalSteps - 1 ? 'Finish' : 'Next' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tour-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      pointer-events: none;
    }
    
    .tour-tooltip {
      position: absolute;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 300px;
      pointer-events: all;
      z-index: 10000;
    }
    
    .tour-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .tour-header h3 {
      margin: 0;
      color: #333;
      font-size: 16px;
    }
    
    .tour-step {
      background: #3f51b5;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    
    .tour-tooltip p {
      margin: 0 0 15px 0;
      color: #666;
      line-height: 1.4;
    }
    
    .tour-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    
    .tour-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .tour-skip, .tour-prev {
      background: #9e9e9e;
      color: white;
    }
    
    .tour-prev:disabled {
      background: #e0e0e0;
      color: #999;
      cursor: not-allowed;
    }
    
    .tour-next {
      background: #3f51b5;
      color: white;
    }
    
    .tour-btn:hover {
      opacity: 0.9;
    }
    
    .tour-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border: 8px solid transparent;
    }
    
    .arrow-top {
      bottom: -16px;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: white;
    }
    
    .arrow-bottom {
      top: -16px;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: white;
    }
    
    .arrow-left {
      right: -16px;
      top: 50%;
      transform: translateY(-50%);
      border-left-color: white;
    }
    
    .arrow-right {
      left: -16px;
      top: 50%;
      transform: translateY(-50%);
      border-right-color: white;
    }
  `]
})
export class TourComponent implements OnInit, OnDestroy {
  isActive = false;
  currentStep = -1;
  currentStepData: any = null;
  totalSteps = 0;
  
  private subscriptions: Subscription[] = [];
  
  constructor(private tourService: TourService) {}
  
  ngOnInit() {
    this.totalSteps = this.tourService.steps.length;
    
    this.subscriptions.push(
      this.tourService.isActive$.subscribe(active => {
        this.isActive = active;
        this.updateTooltipPosition();
      }),
      
      this.tourService.currentStep$.subscribe(step => {
        this.currentStep = step;
        this.currentStepData = step >= 0 ? this.tourService.steps[step] : null;
        setTimeout(() => this.updateTooltipPosition(), 100);
      })
    );
  }
  
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  nextStep() {
    this.tourService.nextStep();
  }
  
  previousStep() {
    this.tourService.previousStep();
  }
  
  skipTour() {
    this.tourService.endTour();
  }
  
  private updateTooltipPosition() {
    if (!this.isActive || this.currentStep < 0) return;
    
    setTimeout(() => {
      const tooltip = document.querySelector('.tour-tooltip') as HTMLElement;
      const target = document.querySelector(this.currentStepData?.target) as HTMLElement;
      
      if (!tooltip || !target) return;
      
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let top = 0, left = 0;
      
      switch (this.currentStepData.position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 10;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + 10;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 10;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 10;
          break;
      }
      
      tooltip.style.top = Math.max(10, top) + 'px';
      tooltip.style.left = Math.max(10, Math.min(window.innerWidth - tooltipRect.width - 10, left)) + 'px';
    }, 0);
  }
}