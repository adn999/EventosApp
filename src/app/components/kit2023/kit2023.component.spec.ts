import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Kit2023Component } from './kit2023.component';

describe('Kit2023Component', () => {
  let component: Kit2023Component;
  let fixture: ComponentFixture<Kit2023Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Kit2023Component]
    });
    fixture = TestBed.createComponent(Kit2023Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
