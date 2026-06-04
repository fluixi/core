import { createComponent, EventName } from '@fluixi/element';
import { FlxDraggable, FlxDraggableItem, FlxDraggableReorderEvent} from '@fluixi/flx-draggable';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-draggable/flx-draggable.js';


const DraggableComponent = createComponent({
    tagName: "flx-draggable",
    elementClass: FlxDraggable,
    compiler: DOM,
    displayName: "FlxDraggable",
    events: {
        onReorder: 'reorder' as EventName<FlxDraggableReorderEvent>
    }
});

export const DraggableItem = createComponent({
    tagName: "flx-drag-item",
    elementClass: FlxDraggableItem,
    compiler: DOM,
    displayName: "FlxDraggableItem"
});


export const Draggable = Object.assign(DraggableComponent, {
    Item: DraggableItem,
})

export default Draggable
