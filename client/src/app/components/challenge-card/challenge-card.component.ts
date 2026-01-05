import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Challenge } from '@common/interfaces/challenges';
import { LucideAngularModule, Info } from 'lucide-angular';
import { CHALLENGES } from '@app/constants';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-challenge-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  templateUrl: './challenge-card.component.html',
  styleUrl: './challenge-card.component.scss'
})
export class ChallengeCardComponent {
  @Input() challenge: Challenge;
  @Input() currentValue: number;
  
  readonly InfoIcon = Info;
  readonly allChallenges = CHALLENGES;
  showPopup = false;

  openPopup() {
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}