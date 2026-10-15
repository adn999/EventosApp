import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSurveyComponent } from './test-survey.component';

describe('TestSurveyComponent', () => {
  let component: TestSurveyComponent;
  let fixture: ComponentFixture<TestSurveyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestSurveyComponent]
    });
    fixture = TestBed.createComponent(TestSurveyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
