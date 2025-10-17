import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeEmpresa } from './home-empresa';

describe('HomeEmpresa', () => {
  let component: HomeEmpresa;
  let fixture: ComponentFixture<HomeEmpresa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeEmpresa]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeEmpresa);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
