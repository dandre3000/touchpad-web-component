import TouchpadHTML from './touchpad.html' with { type: 'text' }

interface AnalogData {
    pointerId: number
    deadzoneX: number
    deadzoneY: number
    controlX: number
    controlY: number
    analogX: number
    analogY: number
}

interface TouchpadData {
    touchpad: HTMLTouchpadElement
    /** Shadow element that is the target of setPointerCapture and releasePointerCapture to prevent user tampering.  */
    pointerCaptureTarget: HTMLElement
    isClicking: boolean
    clickCount: number
    doubleClickTime: number
    doubleClickTimeoutId
    deadzoneRadius: number
    controlRadius: number
    analogMax: number
    analogMap: Map<number, AnalogData>
}

interface TouchListenerObject extends EventListenerObject {
    touchpad: HTMLTouchpadElement
}

interface PointerListenerObject extends EventListenerObject {
    touchpadData: TouchpadData
}

const touchstartListener = function (this: TouchListenerObject, event: TouchEvent) {
    for (const touch of event.changedTouches) {
        const {
            identifier,
            screenX,
            screenY,
            clientX,
            clientY,
            radiusX,
            radiusY
        } = touch

        const width = radiusX * 2
        const height = radiusY * 2

        this.touchpad.dispatchEvent(new PointerEvent('pointerenter', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 1,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        this.touchpad.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 1,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))
    }

    event.preventDefault()
}

const touchmoveListener = function (this: TouchListenerObject, event: TouchEvent) {
    for (const touch of event.changedTouches) {
        const {
            identifier,
            screenX,
            screenY,
            clientX,
            clientY,
            radiusX,
            radiusY
        } = touch

        this.touchpad.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 1,
            screenX,
            screenY,
            clientX,
            clientY,
            width: radiusX * 2,
            height: radiusY * 2,
        }))
    }

    event.preventDefault()
}

const touchendListener = function (this: TouchListenerObject, event: TouchEvent) {
    for (const touch of event.changedTouches) {
        const {
            identifier,
            screenX,
            screenY,
            clientX,
            clientY,
            radiusX,
            radiusY
        } = touch

        const width = radiusX * 2
        const height = radiusY * 2

        this.touchpad.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 0,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        this.touchpad.dispatchEvent(new PointerEvent('click', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 0,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        this.touchpad.dispatchEvent(new PointerEvent('pointerleave', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 0,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))
    }
}

const touchcancelListener = function (this: TouchListenerObject, event: TouchEvent) {
    for (const touch of event.targetTouches) {
        const {
            identifier,
            screenX,
            screenY,
            clientX,
            clientY,
            radiusX,
            radiusY
        } = touch

        const width = radiusX * 2
        const height = radiusY * 2

        this.touchpad.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 0,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        this.touchpad.dispatchEvent(new PointerEvent('pointerleave', {
            bubbles: true,
            pointerId: identifier,
            pointerType: 'touch',
            button: 0,
            buttons: 0,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))
    }
}

/** Constrain a deadzone center to its control circle. */
const constrainDeadzone = (touchpadData: TouchpadData, analogData: AnalogData) => {
    const controlRadius = touchpadData.controlRadius
    const dx = analogData.controlX - analogData.deadzoneX
    const dy = analogData.controlY - analogData.deadzoneY
    const distance = Math.hypot(dx, dy)

    if (distance > controlRadius) {
        const scale = (distance - controlRadius) / distance

        analogData.deadzoneX += dx * scale
        analogData.deadzoneY += dy * scale
    }
}

const pointerdownListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    touchpadData.pointerCaptureTarget.setPointerCapture(event.pointerId)

    if (touchpadData.analogMap.size < touchpadData.analogMax) {
        const { x, y } = touchpadData.touchpad.getBoundingClientRect()
        const analogData = {
            pointerId: event.pointerId,
            deadzoneX: event.clientX - x,
            deadzoneY: event.clientY - y,
            controlX: event.clientX - x,
            controlY: event.clientY - y,
            analogX: 0,
            analogY: 0
        }

        touchpadData.analogMap.set(event.pointerId, analogData)

        constrainDeadzone(touchpadData, analogData)
    }
}

const pointermoveListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (touchpadData.analogMap.size === 0) return

    const analogData = touchpadData.analogMap.get(event.pointerId)

    if (!analogData) return

    const { x, y } = touchpadData.touchpad.getBoundingClientRect()
    const { deadzoneRadius, controlRadius } = touchpadData
    let dx = analogData.controlX - event.clientX + x
    let dy = analogData.controlY - event.clientY + y
    let distance = Math.hypot(dx, dy)

    if (distance > controlRadius + deadzoneRadius) {
        const scale = (distance - controlRadius - deadzoneRadius) / distance

        analogData.controlX -= scale * dx
        analogData.controlY -= scale * dy
    }

    dx = analogData.deadzoneX - event.clientX + x
    dy = analogData.deadzoneY - event.clientY + y
    distance = Math.hypot(dx, dy)

    if (distance > deadzoneRadius) {
        let scale = (distance - deadzoneRadius) / distance

        analogData.deadzoneX -= dx * scale
        analogData.deadzoneY -= dy * scale

        constrainDeadzone(touchpadData, analogData)
    }

    analogData.analogX = (analogData.deadzoneX - analogData.controlX) / controlRadius
    analogData.analogY = (analogData.deadzoneY - analogData.controlY) / controlRadius
    analogData.analogX = Math.round(analogData.analogX * 100) / 100
    analogData.analogY = Math.round(analogData.analogY * 100) / 100
}

const pointerupListener = function (this: PointerListenerObject, event: PointerEvent) {
    this.touchpadData.pointerCaptureTarget.releasePointerCapture(event.pointerId)
    this.touchpadData.analogMap.delete(event.pointerId)
}

const clickListener = function (this: PointerListenerObject, event: PointerEvent) {
    if (!this.touchpadData.isClicking) {
        this.touchpadData.isClicking = true
        this.touchpadData.clickCount++

        clearTimeout(this.touchpadData.doubleClickTimeoutId)
        this.touchpadData.doubleClickTimeoutId = setTimeout(() => {
            this.touchpadData.clickCount = 0
        }, this.touchpadData.doubleClickTime)

        const {
            pointerId,
            pointerType,
            button,
            buttons,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        } = event

        this.touchpadData.touchpad.dispatchEvent(new PointerEvent('click', {
            bubbles: true,
            pointerId,
            pointerType,
            button,
            buttons,
            detail: this.touchpadData.clickCount,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        if ((this.touchpadData.clickCount ^ 1) === this.touchpadData.clickCount + 1) this.touchpadData.touchpad.dispatchEvent(new PointerEvent('dblclick', {
            bubbles: true,
            pointerId,
            pointerType,
            button,
            buttons,
            detail: this.touchpadData.clickCount,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        this.touchpadData.isClicking = false

        event.stopImmediatePropagation()
    }
}

const dblclickListener = function (this: PointerListenerObject, event: PointerEvent) {
    if (!this.touchpadData.isClicking) event.stopImmediatePropagation()
}

const defaultDeadzoneRadius = 8
const defaultControlRadius = 64
const TouchpadMap = new WeakMap<HTMLTouchpadElement, TouchpadData>

export class HTMLTouchpadElement extends HTMLElement {
    static observedAttributes = ['analogmax']

    constructor () {
        super()

        const touchpadData: TouchpadData = {
            touchpad: this,
            pointerCaptureTarget: null as any,
            isClicking: false,
            clickCount: 0,
            doubleClickTime: 500,
            doubleClickTimeoutId: NaN,
            deadzoneRadius: defaultDeadzoneRadius,
            controlRadius: defaultControlRadius,
            analogMax: 0,
            analogMap: new Map
        }

        TouchpadMap.set(this, touchpadData)

        this.addEventListener('touchstart', { touchpad: this, handleEvent: touchstartListener } as TouchListenerObject, true)
        this.addEventListener('touchmove', { touchpad: this, handleEvent: touchmoveListener } as TouchListenerObject, true)
        this.addEventListener('touchend', { touchpad: this, handleEvent: touchendListener } as TouchListenerObject, true)
        this.addEventListener('touchcancel', { touchpad: this, handleEvent: touchcancelListener } as TouchListenerObject, true)
        this.addEventListener('pointerdown', { touchpadData, handleEvent: pointerdownListener } as PointerListenerObject, true)
        this.addEventListener('pointermove', { touchpadData, handleEvent: pointermoveListener } as PointerListenerObject, true)
        this.addEventListener('pointerup', { touchpadData, handleEvent: pointerupListener } as PointerListenerObject, true)
        this.addEventListener('click', { touchpadData, handleEvent: clickListener } as PointerListenerObject, true)
        this.addEventListener('dblclick', { touchpadData, handleEvent: dblclickListener } as PointerListenerObject, true)
    }

    get deadzoneRadius () { return TouchpadMap.get(this).deadzoneRadius }
    set deadzoneRadius (radius) {
        radius = Math.round(Number(radius))
        if (radius < 1)
            radius = 1

        TouchpadMap.get(this).deadzoneRadius = radius
    }

    get controlRadius () { return TouchpadMap.get(this).controlRadius }
    set controlRadius (radius) {
        radius = Math.round(Number(radius))
        if (radius < 1)
            radius = 1

        TouchpadMap.get(this).controlRadius = radius
    }

    getAnalogData (pointerId: number) { return TouchpadMap.get(this).analogMap.get(pointerId) || null }

    attributeChangedCallback (name: string, _: string, newValue: string) {
        if (name === 'analogmax') {
            const touchpadData = TouchpadMap.get(this)
            const pointerIds = touchpadData.analogMap.keys()

            touchpadData.analogMax = Number(newValue)

            if (touchpadData.analogMax < 1) {
                touchpadData.analogMap.clear()
                return
            }

            let i = 0

            for (const id of pointerIds) {
                if (i > touchpadData.analogMax) touchpadData.analogMap.delete(id)
                i++
            }
        }
    }

    connectedCallback () {
        const root = this.attachShadow({ mode: 'closed' })
        root.innerHTML = `${TouchpadHTML}`

        TouchpadMap.get(this).pointerCaptureTarget = root.querySelector('#pointer-capture')
    }
}

customElements.define('touchpad-component', HTMLTouchpadElement)