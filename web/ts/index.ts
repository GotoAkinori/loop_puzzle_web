import { Stage } from "./stage";

let make_puzzle_web: (size_r: number, size_c: number) => string;
let make_puzzle_web2: (size_r: number, size_c: number) => string;
import("../node_modules/loop_puzzle_web/loop_puzzle_web.js").then(async (js) => {
    make_puzzle_web = (await js.default).make_puzzle_web;
    make_puzzle_web2 = (await js.default).make_puzzle_web2;
});

let stage: Stage;

async function init() {
    let stageSvg = document.getElementById("stage") as unknown as SVGElement;
    let uiOptionForm = document.getElementById("ui-option") as HTMLFormElement;

    stage = new Stage(stageSvg);

    let preventClick = false;
    stageSvg.addEventListener("click", (ev) => {
        if (!preventClick) {
            let stageRect = stageSvg.getBoundingClientRect();

            if (uiOptionForm["line-noline"].value == "line") {
                stage.click(
                    ev.clientX - stageRect.left,
                    ev.clientY - stageRect.top
                );
            } else {
                stage.rclick(
                    ev.clientX - stageRect.left,
                    ev.clientY - stageRect.top
                );
            }
        } else {
            preventClick = false;
        }
    });

    stageSvg.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        if (!preventClick) {
            let stageRect = stageSvg.getBoundingClientRect();
            if (uiOptionForm["line-noline"].value == "line") {
                stage.rclick(
                    ev.clientX - stageRect.left,
                    ev.clientY - stageRect.top
                );
            } else {
                stage.click(
                    ev.clientX - stageRect.left,
                    ev.clientY - stageRect.top
                );
            }
        } else {
            preventClick = false;
        }
    });

    // PC
    if (!navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
        const PREVENT_CLICK_MOVE_DIST = 10;

        document.addEventListener("keydown", (ev) => {
            // svg element won't be active. so insteadly check if "body is active".
            if (document.activeElement == document.body) {
                if (ev.ctrlKey) {
                    switch (ev.code) {
                        case "KeyZ": {
                            stage.loadLineInfo(stage.lineInfoIndex - 1);
                            ev.preventDefault();
                        } break;
                        case "KeyY": {
                            stage.loadLineInfo(stage.lineInfoIndex + 1);
                            ev.preventDefault();
                        } break;
                    }
                }
            }
        });

        let dragging = false;
        let dragX = 0;
        let dragY = 0;
        let scrollX = 0;
        let scrollY = 0;

        // scroll
        stageSvg.addEventListener("mousedown", (ev) => {
            dragging = true;
            dragX = ev.clientX;
            dragY = ev.clientY;
            scrollX = stage.scrollX;
            scrollY = stage.scrollY;
        });
        window.addEventListener("mousemove", (ev) => {
            if (dragging) {
                stage.scroll(ev.clientX - dragX + scrollX, ev.clientY - dragY + scrollY);

                // prevent click
                if ((ev.clientX - dragX) * (ev.clientX - dragX) + (ev.clientY - dragY) * (ev.clientY - dragY) > PREVENT_CLICK_MOVE_DIST * PREVENT_CLICK_MOVE_DIST) {
                    preventClick = true;
                }
            }
        });
        window.addEventListener("mouseup", () => {
            dragging = false;
        });

        // scale
        stageSvg.addEventListener("wheel", (ev) => {
            ev.preventDefault();
            let stageRect = stageSvg.getBoundingClientRect();
            let cx = ev.clientX - stageRect.left;
            let cy = ev.clientY - stageRect.top;

            if (ev.deltaY < 0) {
                stage.scaleUp(cx, cy);
            } else {
                stage.scaleDown(cx, cy);
            }
        });
    }

    else { // Mobile
        let prevCX = -1;
        let prevCY = -1;
        let prevDist = -1;
        let initDist = -1;
        const SCALE_INTERVAL = 20;
        let gestureStarted = false;
        let pointers: PointerEvent[] = [];

        function getDistance() {
            return Math.sqrt(
                (pointers[0].clientX - pointers[1].clientX) * (pointers[0].clientX - pointers[1].clientX) +
                (pointers[0].clientY - pointers[1].clientY) * (pointers[0].clientY - pointers[1].clientY)
            );
        }

        // scale
        function pointerRemove(ev: PointerEvent) {
            // remove pointer
            let pointerIndex = pointers.findIndex(v => v.pointerId == ev.pointerId);
            if (pointerIndex != -1) {
                pointers.splice(pointerIndex, 1);
            }

            // reset previous distance of 2 pointers
            gestureStarted = false;

            if (pointers.length > 0) {
                preventClick = true;
            } else {
                preventClick = false;
            }
        }

        // prevent default event (pinch operation)
        document.body.addEventListener('touchmove', (e) => {
            if (e.touches.length >= 2) {
                e.preventDefault();
            }
        }, { passive: false });

        stageSvg.addEventListener("pointerout", pointerRemove);
        stageSvg.addEventListener("pointerup", pointerRemove);
        stageSvg.addEventListener("pointercancel", pointerRemove);
        stageSvg.addEventListener("pointerdown", (ev) => {
            pointers.push(ev);
            if (pointers.length >= 2) {
                preventClick = true;
            }
        });
        stageSvg.addEventListener("pointermove", (ev) => {
            // update pointer
            let pointerIndex = pointers.findIndex(v => v.pointerId == ev.pointerId);
            if (pointerIndex != -1) {
                pointers[pointerIndex] = ev;
            }

            if (pointers.length >= 2) {
                ev.preventDefault();
                let currCX = (pointers[0].clientX + pointers[1].clientX) / 2;
                let currCY = (pointers[0].clientY + pointers[1].clientY) / 2;
                let currDist = getDistance();
                let prevScaleIndex = Math.floor((prevDist - initDist) / SCALE_INTERVAL);
                let currScaleIndex = Math.floor((currDist - initDist) / SCALE_INTERVAL);

                // pinch out / pinch in
                if (!gestureStarted) {
                    gestureStarted = true;
                } else {
                    // scale
                    if (
                        currScaleIndex > prevScaleIndex
                    ) {
                        // scale up
                        for (let i = 0; i < currScaleIndex - prevScaleIndex; i++) {
                            stage.scaleUp(currCX, currCY);
                        }
                    } else if (
                        currScaleIndex < prevScaleIndex
                    ) {
                        // scale down
                        for (let i = 0; i < prevScaleIndex - currScaleIndex; i++) {
                            stage.scaleDown(currCX, currCY);
                        }
                    }

                    // move
                    if (currCX != prevCX || currCY != prevCY) {
                        stage.scroll(stage.scrollX + currCX - prevCX, stage.scrollY + currCY - prevCY);
                    }
                }
                prevCX = currCX;
                prevCY = currCY;
                prevDist = currDist;
            } else {
                gestureStarted = false;
                preventClick = false;
            }
        });
    }

    document.getElementById("new_puzzle")!.addEventListener("click", () => {
        let width = Number((document.getElementById("stage_width") as HTMLInputElement).value);
        let height = Number((document.getElementById("stage_height") as HTMLInputElement).value);

        let puzzle_string = make_puzzle_web2(height, width);

        stage.init(width, height, puzzle_string);
        stage.resetView();
    });
    document.getElementById("undo")!.addEventListener("click", () => {
        stage.loadLineInfo(stage.lineInfoIndex - 1);
    });
    document.getElementById("redo")!.addEventListener("click", () => {
        stage.loadLineInfo(stage.lineInfoIndex + 1);
    });
}

function waitLoad() {
    if (document.body) {
        init();
    }
    else {
        setTimeout(waitLoad, 10);
    }
}
waitLoad();
