import { Injectable } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class CesiumService {
  private viewer!: Viewer;
  private screenSpaceEventHandler!: ScreenSpaceEventHandler;
  private cartesian: Cartesian3 | undefined = undefined; // Current mouse position in Cartesian coordinates
  private tempCartographic: Cartographic = new Cartographic(); // Temporary cartographic position
  private firstPoint: Cartographic = new Cartographic(); // First corner of the rectangle
  private firstPointSet: boolean = false; // Flag indicating if the first corner of the rectangle is set
  private mouseDown: boolean = false; // Flag indicating if the mouse button is down
  private rectangleSelector: Rectangle = new Rectangle(); // Cesium rectangle object
  private selector: any = { show: false, rectangle: { coordinates: undefined } }; // Selector state object

  // Initializes the Cesium viewer and sets up necessary configurations
  initialize(containerId: string): void {
    this.viewer = new Viewer(containerId, {
      targetFrameRate: 60,
      scene3DOnly: false,
    });

    // Configure viewer settings
    this.viewer.scene.debugShowFramesPerSecond = true;
    this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
    this.viewer.scene.screenSpaceCameraController.enableTilt = false;
    this.viewer.scene.screenSpaceCameraController.enableLook = false;
    this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    this.viewer.imageryLayers.get(0).brightness = 0.7;

    // Initialize screen space event handler for mouse interactions
    this.screenSpaceEventHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);

    // Setup rectangle drawing functionality
    this.setupRectangleDrawing();
  }

  // Sets up mouse event handlers for drawing rectangles on the Cesium viewer
  private setupRectangleDrawing() {
    // Mouse move event handler to draw the rectangle dynamically
    this.screenSpaceEventHandler.setInputAction((movement: { endPosition: Cartesian2; }) => {
      if (!this.mouseDown) {
        return;
      }

      // Get Cartesian position of the mouse pointer on the ellipsoid
      this.cartesian = this.viewer.camera.pickEllipsoid(movement.endPosition, this.viewer.scene.globe.ellipsoid, this.cartesian);

      if (this.cartesian) {
        // Convert Cartesian position to cartographic coordinates
        this.tempCartographic = Cartographic.fromCartesian(this.cartesian, Ellipsoid.WGS84, this.tempCartographic);

        if (!this.firstPointSet) {
          // Set the first corner of the rectangle
          this.firstPoint = Cartographic.clone(this.tempCartographic, this.firstPoint);
          this.firstPointSet = true;
        } else {
          // Adjust the rectangle coordinates based on mouse movement
          this.rectangleSelector.east = Math.max(this.tempCartographic.longitude, this.firstPoint.longitude);
          this.rectangleSelector.west = Math.min(this.tempCartographic.longitude, this.firstPoint.longitude);
          this.rectangleSelector.north = Math.max(this.tempCartographic.latitude, this.firstPoint.latitude);
          this.rectangleSelector.south = Math.min(this.tempCartographic.latitude, this.firstPoint.latitude);
          this.selector.show = true; // Show the rectangle selector
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE, KeyboardEventModifier.SHIFT);

    // Left mouse button down event handler to start drawing the rectangle
    this.screenSpaceEventHandler.setInputAction(() => {
      this.mouseDown = true;
      this.selector.rectangle.coordinates = this.getSelectorLocation(); // Update selector coordinates
    }, ScreenSpaceEventType.LEFT_DOWN, KeyboardEventModifier.SHIFT);

    // Left mouse button up event handler to finish drawing the rectangle
    this.screenSpaceEventHandler.setInputAction(() => {
      this.mouseDown = false;
      this.firstPointSet = false;
      this.selector.rectangle.coordinates = this.rectangleSelector; // Finalize rectangle coordinates
    }, ScreenSpaceEventType.LEFT_UP, KeyboardEventModifier.SHIFT);

    // Left click event handler to hide the rectangle selector
    this.screenSpaceEventHandler.setInputAction(() => {
      this.selector.show = false;
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Add rectangle entity to the viewer entities collection
    this.selector = this.viewer.entities.add({
      show: false,
      rectangle: {
        coordinates: this.getSelectorLocation(), // Initial coordinates of the rectangle selector
        material: Color.RED.withAlpha(0.5) // Red color with 50% transparency
      }
    });
  }

  // Calculates and displays the area of the drawn rectangle on the Cesium viewer
  calculateArea(): void {
    if (this.viewer.entities.values.length > 0) {
      const rectangleEntity = this.viewer.entities.values[0];
      if (rectangleEntity.rectangle && rectangleEntity.rectangle.coordinates) {
        const rectangle = rectangleEntity.rectangle.coordinates.getValue(JulianDate.now());
        if (rectangle) {
          // Compute the area of the rectangle
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

  // Computes the area of the given rectangle using Cartesian coordinates
  private computeRectangleArea(rectangle: Rectangle): number {
    const west = rectangle.west;
    const south = rectangle.south;
    const east = rectangle.east;
    const north = rectangle.north;

    const ellipsoid = Ellipsoid.WGS84;

    // Convert cartographic coordinates to Cartesian coordinates
    const southwest = Cartographic.toCartesian(new Cartographic(west, south), ellipsoid);
    const southeast = Cartographic.toCartesian(new Cartographic(east, south), ellipsoid);
    const northwest = Cartographic.toCartesian(new Cartographic(west, north), ellipsoid);

    // Calculate width and height of the rectangle
    const width = Cartesian3.distance(southwest, southeast);
    const height = Cartesian3.distance(southwest, northwest);

    // Calculate area in square kilometers
    const area = (width * height) / 1e6;

    return area;
  }

  // Returns the callback property for the rectangle selector location
  private getSelectorLocation(): CallbackProperty {
    return new CallbackProperty((time, result) => {
      return Rectangle.clone(this.rectangleSelector, result); // Clone the current rectangle selector coordinates
    }, false);
  }
}
