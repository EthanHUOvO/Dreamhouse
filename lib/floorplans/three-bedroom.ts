import { furnitureItem } from "../house-scene";
import { buildFloorplanScene, type FloorplanSpec } from "./types";
import { twoBedroomSpec } from "./two-bedroom";
export const threeBedroomSpec: FloorplanSpec = {
  ...twoBedroomSpec,
  id: "three-bedroom",
  name: "三居室",
  factory: "createThreeBedroomFloorplanScene",
  sourceImage: "/preset/generated-plan-01.png",
  walls: [
    ...twoBedroomSpec.walls,
    {
      id: "wall_right_split",
      start: [5.88, 3.5],
      end: [9.159, 3.5],
      structural: "partition",
    },
  ],
  rooms: [
    ...twoBedroomSpec.rooms.filter((r) => r.id !== "zone_bedroom_2"),
    {
      id: "zone_bedroom_2",
      name: "卧室",
      semantic: "bedroom",
      polygon: [
        [5.88, 1.282],
        [9.159, 1.282],
        [9.159, 3.5],
        [5.88, 3.5],
      ],
      expectedArea: 7.1,
      color: "#91a4c2",
    },
    {
      id: "zone_child",
      name: "儿童房",
      semantic: "child_room",
      polygon: [
        [5.88, 3.5],
        [9.159, 3.5],
        [9.159, 5.715],
        [5.88, 5.715],
      ],
      expectedArea: 7.1,
      color: "#88aa9c",
    },
  ],
  doors: [
    ...twoBedroomSpec.doors.filter((d) => d.id !== "door_bedroom_2"),
    {
      id: "door_bedroom_2",
      name: "卧室门",
      wallId: "wall_living_right",
      distance: 1.05,
      width: 0.82,
    },
    {
      id: "door_child",
      name: "儿童房门",
      wallId: "wall_living_right",
      distance: 3.45,
      width: 0.82,
    },
  ],
};
export function createThreeBedroomFloorplanScene() {
  return buildFloorplanScene(threeBedroomSpec, [
    furnitureItem(
      "item_master_bed",
      "zone_bedroom",
      "doubleBed",
      [1.6, 0, 4.5],
    ),
    furnitureItem(
      "item_second_bed",
      "zone_bedroom_2",
      "singleBed",
      [7.4, 0, 2.4],
    ),
    furnitureItem("item_child_bed", "zone_child", "singleBed", [7.4, 0, 4.6]),
    furnitureItem("item_living_sofa", "zone_living", "sofa", [4.4, 0, 3.8]),
    furnitureItem("item_kitchen", "zone_kitchen", "kitchen", [1.8, 0, 7.4]),
  ]);
}
