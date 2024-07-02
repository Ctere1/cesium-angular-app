import { Component, OnInit } from '@angular/core';
import { CesiumService } from '../services/cesium.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  constructor(private cesiumService: CesiumService) {}

  ngOnInit(): void {
    this.cesiumService.initialize('cesiumContainer');
  }

  onDrawRectangle(): void {
    // Rectangle drawing is handled by the CesiumService
  }

  onCalculateArea(): void {
    this.cesiumService.calculateArea();
  }
}
