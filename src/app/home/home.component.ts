import { Component, OnInit } from '@angular/core';
import {
  Viewer,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Rectangle,
  Cartesian3,
  Cartographic,
  Color,
  JulianDate,
  Ellipsoid,
  CallbackProperty,
  KeyboardEventModifier,
  Cartesian2
} from 'cesium';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  viewer!: Viewer; // Cesium Viewer object
  selector: any = { show: false, rectangle: { coordinates: undefined } }; // Selector state and rectangle coordinates
  rectangleSelector: Rectangle = new Rectangle(); // Rectangle object
  screenSpaceEventHandler!: ScreenSpaceEventHandler; // Screen space event handler
  cartesian: Cartesian3 | undefined = undefined; // Cartesian3 object
  tempCartographic: Cartographic = new Cartographic(); // Temporary Cartographic data
  firstPoint: Cartographic = new Cartographic(); // First point Cartographic data
  firstPointSet: boolean = false; // Is the first point set?
  mouseDown: boolean = false; // Is mouse button down?

  ngOnInit(): void {
    // Creating and configuring Cesium Viewer
    this.viewer = new Viewer('cesiumContainer', {
      targetFrameRate: 60, // Target FPS
      scene3DOnly: true, // 3D mode only
    });

    // Call rectangle drawing setup function
    this.setupRectangleDrawing();
  }

  // Function to setup rectangle drawing
  setupRectangleDrawing() {
    if (!this.viewer) {
      return; // Exit if Viewer is not initialized
    }

    // Configure FPS display and camera controls
    this.viewer.scene.debugShowFramesPerSecond = true;
    this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
    this.viewer.scene.screenSpaceCameraController.enableTilt = false;
    this.viewer.scene.screenSpaceCameraController.enableLook = false;
    this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    this.viewer.imageryLayers.get(0).brightness = 0.7;

    // Create screen space event handler
    this.screenSpaceEventHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);

    // Function to draw rectangle while mouse is moved
    this.screenSpaceEventHandler.setInputAction((movement: { endPosition: Cartesian2; }) => {
      if (!this.mouseDown) {
        return; // Exit if mouse button is not down
      }

      // Convert mouse position to Cartesian3
      this.cartesian = this.viewer.camera.pickEllipsoid(movement.endPosition, this.viewer.scene.globe.ellipsoid, this.cartesian);

      if (this.cartesian) {
        // Convert Cartesian3 to Cartographic coordinates
        this.tempCartographic = Cartographic.fromCartesian(this.cartesian, Ellipsoid.WGS84, this.tempCartographic);

        if (!this.firstPointSet) {
          // Set the first point
          this.firstPoint = Cartographic.clone(this.tempCartographic, this.firstPoint);
          this.firstPointSet = true;
        } else {
          // Set rectangle coordinates
          this.rectangleSelector.east = Math.max(this.tempCartographic.longitude, this.firstPoint.longitude);
          this.rectangleSelector.west = Math.min(this.tempCartographic.longitude, this.firstPoint.longitude);
          this.rectangleSelector.north = Math.max(this.tempCartographic.latitude, this.firstPoint.latitude);
          this.rectangleSelector.south = Math.min(this.tempCartographic.latitude, this.firstPoint.latitude);
          this.selector.show = true; // Show the selector
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE, KeyboardEventModifier.SHIFT);

    // Function to start drawing rectangle on left mouse down with Shift key
    this.screenSpaceEventHandler.setInputAction(() => {
      this.mouseDown = true; // Set mouse down
      this.selector.rectangle.coordinates = this.getSelectorLocation(); // Set selector coordinates
    }, ScreenSpaceEventType.LEFT_DOWN, KeyboardEventModifier.SHIFT);

    // Function to end drawing rectangle on left mouse up with Shift key
    this.screenSpaceEventHandler.setInputAction(() => {
      this.mouseDown = false; // Set mouse up
      this.firstPointSet = false; // Reset first point
      this.selector.rectangle.coordinates = this.rectangleSelector; // Set rectangle coordinates
    }, ScreenSpaceEventType.LEFT_UP, KeyboardEventModifier.SHIFT);

    // Function to hide selector by clicking anywhere
    this.screenSpaceEventHandler.setInputAction(() => {
      this.selector.show = false; // Hide the selector
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Add selector to entities inside Viewer
    this.selector = this.viewer.entities.add({
      show: false, // Initially hide the selector
      rectangle: {
        coordinates: this.getSelectorLocation(), // Rectangle coordinates
        material: Color.RED.withAlpha(0.5) // Material of the rectangle (color and opacity)
      }
    });
  }

  // Function to calculate area of the rectangle
  calculateArea() {
    if (this.viewer.entities.values.length > 0) {
      const rectangleEntity = this.viewer.entities.values[0];
      if (rectangleEntity.rectangle && rectangleEntity.rectangle.coordinates) {
        const rectangle = rectangleEntity.rectangle.coordinates.getValue(JulianDate.now());
        if (rectangle) {
          const area = this.computeRectangleArea(rectangle);
          alert(`Area: ${area.toFixed(2)} square kilometers`);
        } else {
          alert('Rectangle coordinates are not properly defined.');
        }
      } else {
        alert('Rectangle entity or its coordinates are not properly defined.');
      }
    } else {
      alert('No rectangle found.');
    }
  }

  // Function to compute the area of the rectangle
  computeRectangleArea(rectangle: Rectangle): number {
    const west = rectangle.west; // West longitude
    const south = rectangle.south; // South latitude
    const east = rectangle.east; // East longitude
    const north = rectangle.north; // North latitude

    const ellipsoid = Ellipsoid.WGS84; // World ellipsoid

    // Convert corners to Cartesian3 coordinates
    const southwest = Cartographic.toCartesian(new Cartographic(west, south), ellipsoid);
    const southeast = Cartographic.toCartesian(new Cartographic(east, south), ellipsoid);
    const northwest = Cartographic.toCartesian(new Cartographic(west, north), ellipsoid);

    // Calculate width and height
    const width = Cartesian3.distance(southwest, southeast);
    const height = Cartesian3.distance(southwest, northwest);

    // Calculate area (in square meters)
    const area = (width * height) / 1e6; // Convert square meters to square kilometers

    return area; // Return the area
  }

  // Function to return the selector location
  getSelectorLocation(): CallbackProperty {
    return new CallbackProperty((time, result) => {
      return Rectangle.clone(this.rectangleSelector, result);
    }, false);
  }
}
