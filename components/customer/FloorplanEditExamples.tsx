"use client";

import { useEffect, useRef, useState } from "react";

export const FLOORPLAN_EDIT_EXAMPLES = [
  {
    id: "master-bedroom-bathroom",
    title: "主卧增加卫生间",
    detailedText:
      "请基于当前户型图进行局部修改：在主卧内部靠左下角的位置划分出一个独立卫生间。卫生间应位于主卧范围内，通过主卧内部开门进入，不要占用客餐厅、厨房或其他卧室的空间。只允许调整主卧左下角附近的局部墙体、门洞和家具位置；主卧以外的房间位置、户型外围轮廓、原有门窗位置和整体空间关系保持不变。修改完成后，保持原户型图的视角、比例、线条、颜色和标注风格不变。",
  },
  {
    id: "living-room-add-bedroom",
    title: "客餐厅上侧增加卧室",
    detailedText:
      "请基于当前户型图进行局部修改：在客餐厅的上侧区域划分出一个新的独立卧室。优先利用客餐厅上方现有的可用空间，通过新增局部隔墙形成完整封闭房间，并为新卧室设置一个能够从客餐厅或公共走道正常进入的房门。只允许缩小客餐厅上侧的局部面积，不要移动厨房、卫生间、主卧、次卧以及户型外围墙体。原有门窗如果不与新增隔墙冲突，应保持原位置不变。除新增卧室相关的隔墙、房门和内部家具之外，其余区域保持不变。",
  },
  {
    id: "second-bedroom-study",
    title: "次卧改成书房",
    detailedText:
      "请保持当前户型的墙体结构、房间边界、门窗位置和户型外围轮廓不变，只将现有次卧的使用功能调整为书房。不要拆除或移动次卧外围墙体，不要改变次卧房门和窗户的位置。将次卧内部原有的床、床头柜等卧室家具移除，重新布置为书桌、办公椅、书柜和必要的收纳家具。主卧、客餐厅、厨房、卫生间以及其他空间全部保持原状。修改后的户型图继续保持原来的视角、比例、线条、颜色和标注方式。",
  },
  {
    id: "living-room-new-room",
    title: "客餐厅靠厨房增加房间",
    detailedText:
      "请基于当前户型图进行局部修改：在客餐厅靠近厨房的一侧划分出一个新的独立房间。通过增加局部隔墙形成完整封闭空间，并设置一个从客餐厅或公共走道进入的房门。新房间只允许占用客餐厅靠近厨房的一部分区域，不要改变厨房自身的墙体、门和内部布局，也不要移动卫生间、主卧、次卧以及户型外围墙体。新增房间之外的空间位置、房间功能、门窗和主要结构保持不变。",
  },
  {
    id: "bathroom-door",
    title: "调整卫生间门的位置",
    detailedText:
      "请只调整当前户型中卫生间房门的位置，不要改变卫生间的面积、位置和外围墙体形状。将卫生间门移动到更靠近公共走道、进出更加顺畅的位置，避免房门开启后阻挡主要通行区域。允许封闭原来的门洞，并在卫生间同一面内墙或相邻合理内墙上重新设置新的门洞。卫生间内部主要功能布局尽量保持不变。其他房间的墙体、门窗、家具以及整个户型的外围轮廓全部保持原样。",
  },
  {
    id: "living-room-small-bedroom",
    title: "客餐厅划分小卧室",
    detailedText:
      "请基于当前户型图进行局部修改：在客餐厅的一侧划分出一个面积较小但完整独立的卧室。优先选择靠近现有墙体的一侧增加隔墙，尽量减少新增墙体数量，并为新卧室设置一个能够正常进出的房门。只允许压缩客餐厅的局部面积，不要侵占厨房、卫生间、主卧和其他已有卧室。户型外围轮廓、原有门窗位置以及与新增卧室无关的其他房间保持不变。除新卧室相关区域之外，不要重新设计整个户型。",
  },
  {
    id: "expand-master-bedroom",
    title: "扩大主卧空间",
    detailedText:
      "请基于当前户型图对主卧进行局部扩大。优先通过调整主卧与直接相邻室内空间之间的局部隔墙来增加主卧的可使用面积，不要改变户型外围轮廓。只允许修改与主卧直接相邻的隔墙和必要的家具位置，尽量减少对相邻房间面积和功能的影响。主卧扩大后，可以重新调整床、床头柜和衣柜的位置，使主卧内部布局合理。厨房、卫生间、客餐厅以及与主卧无直接关系的其他房间位置、门窗和主要结构保持不变。",
  },
] as const;

const RESUME_DELAY_MS = 4_000;
const ADVANCE_INTERVAL_MS = 2_800;
const SMOOTH_SCROLL_MS = 650;

export default function FloorplanEditExamples({ onSelect }: { onSelect: (text: string) => void }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = useRef(false);
  const userPausedRef = useRef(false);
  const currentIndexRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  };

  const pauseForInteraction = () => {
    userPausedRef.current = true;
    clearResumeTimer();
  };

  const syncIndexToScrollPosition = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const items = [...viewport.querySelectorAll<HTMLElement>(".floorplan-example-item")];
    const firstItem = items[0];
    if (!firstItem) return;
    const closestIndex = items.reduce((closest, item, index) => {
      const distance = Math.abs(item.offsetTop - firstItem.offsetTop - viewport.scrollTop);
      const closestItem = items[closest];
      const closestDistance = closestItem
        ? Math.abs(closestItem.offsetTop - firstItem.offsetTop - viewport.scrollTop)
        : Number.POSITIVE_INFINITY;
      return distance < closestDistance ? index : closest;
    }, 0);
    currentIndexRef.current = closestIndex % FLOORPLAN_EDIT_EXAMPLES.length;
  };

  const resumeAfterInteraction = () => {
    clearResumeTimer();
    syncIndexToScrollPosition();
    userPausedRef.current = true;
    resumeTimerRef.current = setTimeout(() => {
      userPausedRef.current = false;
    }, RESUME_DELAY_MS);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      if (hoveredRef.current || userPausedRef.current) return;
      const nextIndex = currentIndexRef.current + 1;
      const items = viewport.querySelectorAll<HTMLElement>(".floorplan-example-item");
      const nextItem = items[nextIndex];
      const firstItem = items[0];
      if (!nextItem || !firstItem) return;
      viewport.scrollTo({ top: nextItem.offsetTop - firstItem.offsetTop, behavior: "smooth" });
      currentIndexRef.current = nextIndex;

      if (nextIndex === FLOORPLAN_EDIT_EXAMPLES.length) {
        resetTimerRef.current = setTimeout(() => {
          viewport.scrollTo({ top: 0, behavior: "auto" });
          currentIndexRef.current = 0;
        }, SMOOTH_SCROLL_MS);
      }
    }, ADVANCE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      clearResumeTimer();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const chooseExample = (id: string, detailedText: string) => {
    setSelectedId(id);
    onSelect(detailedText);
    pauseForInteraction();
    resumeAfterInteraction();
  };

  return <section className="floorplan-examples" aria-labelledby="floorplan-examples-title">
    <div className="floorplan-examples-heading">
      <b id="floorplan-examples-title">修改示例</b>
      <span>点击整条即可填入</span>
    </div>
    <div
      className="floorplan-examples-viewport"
      ref={viewportRef}
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; resumeAfterInteraction(); }}
      onPointerDown={pauseForInteraction}
      onPointerUp={resumeAfterInteraction}
      onPointerCancel={resumeAfterInteraction}
      onWheel={() => { pauseForInteraction(); resumeAfterInteraction(); }}
      onTouchMove={() => { pauseForInteraction(); resumeAfterInteraction(); }}
    >
      <div className="floorplan-examples-track">
        {[0, 1].map((copyIndex) => (
          <div className="floorplan-examples-loop" key={copyIndex} aria-hidden={copyIndex === 1 || undefined}>
            {FLOORPLAN_EDIT_EXAMPLES.map((example) => (
              <button
                type="button"
                key={`${example.id}-${copyIndex}`}
                className={`floorplan-example-item ${selectedId === example.id ? "selected" : ""}`}
                onClick={() => chooseExample(example.id, example.detailedText)}
                tabIndex={copyIndex === 1 ? -1 : 0}
              >
                <i aria-hidden="true" />
                <span>{example.title}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>;
}
