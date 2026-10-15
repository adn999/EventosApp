import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatQuestionsComponent } from './cat-questions.component';

describe('CatQuestionsComponent', () => {
  let component: CatQuestionsComponent;
  let fixture: ComponentFixture<CatQuestionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CatQuestionsComponent]
    });
    fixture = TestBed.createComponent(CatQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
