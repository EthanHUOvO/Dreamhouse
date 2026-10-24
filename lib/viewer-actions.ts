export type ViewerMoveVector = {
  x: number;
  y: number;
};

/** Input-agnostic actions shared by keyboard, pointer and future touch controls. */
export type ViewerActions = {
  moveForward: () => void;
  moveBackward: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  setMoveVector: (x: number, y: number) => void;
  look: (deltaX: number, deltaY: number) => void;
  interact: () => void;
  capture: () => void;
};
