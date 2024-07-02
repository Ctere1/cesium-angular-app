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
  private cartesian: Cartesian3 | undefined = undefined;
  private tempCartographic: Cartographic = new Cartographic();
  private firstPoint: Cartographic = new Cartographic();
  private firstPointSet: boolean = false;
  private mouseDown: boolean = false;
  private rectangleSelector: Rectangle = new Rectangle();
  private selector: any = { show: false, rectangle: { coordinates: undefined } };

  initialize(containerId: string): void {
    this.viewer = new Viewer(containerId, {
      targetFrameRate: 60,
      scene3DOnly: true,
    });

    this.viewer.scene.debugShowFramesPerSecond = true;
    this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
    this.viewer.scene.screenSpaceCameraController.enableTilt = false;
    this.viewer.scene.screenSpaceCameraController.enableLook = false;
    this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    this.viewer.imageryLayers.get(0).brightness = 0.7;

    this.screenSpaceEventHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);

    this.setupRectangleDrawing();
  }

  private setupRectangleDrawing() {
    this.screenSpaceEventHandler.setInputAction((movement: { endPosition: Cartesian2; }) => {
      if (!this.mouseDown) {
        return;
      }

      this.cartesian = this.viewer.camera.pickEllipsoid(movement.endPosition, this.viewer.scene.globe.ellipsoid, this.cartesian);

      if (this.cartesian) {
        this.tempCartographic = Cartographic.fromCartesian(this.cartesian, Ellipsoid.WGS84, this.tempCartographic);

        if (!this.firstPointSet) {
          this.firstPoint = Cartographic.clone(this.tempCartographic, this.firstPoint);
          this.firstPointSet = true;
        } else {
          this.rectangleSelector.east = Math.max(this.tempCartographic.longitude, this.firstPoint.longitude);
          this.rectangleSelector.west = Math.min(this.tempCartographic.longitude, this.firstPoint.longitude);
          this.rectangleSelector.north = Math.max(this.tempCartographic.latitude, this.firstPoint.latitude);
          this.rectangleSelector.south = Math.min(this.tempCartographic.latitude, this.firstPoint.latitude);
          this.selector.show = true;
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE, KeyboardEventModifier.SHIFT);

    this.screenSpaceEventHandler.setInputAction(() => {
      this.mouseDown = true;
      this.selector.rectangle.coordinates = this.getSelectorLocation();
    }, ScreenSpaceEventType.LEFT_DOWN, KeyboardEventModifier.SHIFT);

    this.screenSpaceEventHandler.setInputAction(() => {
      this.mouseDown = false;
      this.firstPointSet = false;
      this.selector.rectangle.coordinates = this.rectangleSelector;
    }, ScreenSpaceEventType.LEFT_UP, KeyboardEventModifier.SHIFT);

    this.screenSpaceEventHandler.setInputAction(() => {
      this.selector.show = false;
    }, ScreenSpaceEventType.LEFT_CLICK);

    this.selector = this.viewer.entities.add({
      show: false,
      rectangle: {
        coordinates: this.getSelectorLocation(),
        material: Color.RED.withAlpha(0.5)
      }
    });
  }

  calculateArea(): void {
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

  private computeRectangleArea(rectangle: Rectangle): number {
    const west = rectangle.west;
    const south = rectangle.south;
    const east = rectangle.east;
    const north = rectangle.north;

    const ellipsoid = Ellipsoid.WGS84;

    const southwest = Cartographic.toCartesian(new Cartographic(west, south), ellipsoid);
    const southeast = Cartographic.toCartesian(new Cartographic(east, south), ellipsoid);
    const northwest = Cartographic.toCartesian(new Cartographic(west, north), ellipsoid);

    const width = Cartesian3.distance(southwest, southeast);
    const height = Cartesian3.distance(southwest, northwest);

    const area = (width * height) / 1e6;

    return area;
  }

  private getSelectorLocation(): CallbackProperty {
    return new CallbackProperty((time, result) => {
      return Rectangle.clone(this.rectangleSelector, result);
    }, false);
  }
}
