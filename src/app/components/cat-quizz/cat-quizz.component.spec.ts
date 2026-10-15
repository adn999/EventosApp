import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatQuizzComponent } from './cat-quizz.component';

describe('CatQuizzComponent', () => {
  let component: CatQuizzComponent;
  let fixture: ComponentFixture<CatQuizzComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CatQuizzComponent]
    });
    fixture = TestBed.createComponent(CatQuizzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
