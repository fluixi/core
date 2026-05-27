import { createJsxComponent as createComponent } from '@awc/kettlejs';
import { AdfCard, AdfCardBody, AdfCardHeader, AdfCardFooter} from '@awc/adf-card';
import DOM from "@awc/dom"
// import '@awc/adf-card/adf-card.js';


const CardComponent = createComponent({
    tagName: "adf-card",
    elementClass: AdfCard,
    compiler: DOM,
    displayName: "AdfCard",
});
const CardHeader = createComponent({
    tagName: "adf-card-header",
    elementClass: AdfCardHeader,
    compiler: DOM,
    displayName: "AdfCardHeader",
});
const CardBody = createComponent({
    tagName: "adf-card-body",
    elementClass: AdfCardBody,
    compiler: DOM,
    displayName: "AdfCardBody",
});
const CardFooter = createComponent({
    tagName: "adf-card-footer",
    elementClass: AdfCardFooter,
    compiler: DOM,
    displayName: "AdfCardFooter",
});

export const Card = Object.assign(CardComponent, {
    Header: CardHeader,
    Body: CardBody,
    Footer: CardFooter
})

export default Card