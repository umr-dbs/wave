import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EBVComponent } from './ebv-selection.component';

describe('LoginComponent', () => {
  let component: EBVComponent;
  let fixture: ComponentFixture<EBVComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EBVComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EBVComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
