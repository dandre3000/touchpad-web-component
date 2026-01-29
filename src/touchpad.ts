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
    touchpad: Touchpad
    deadzoneRadius: number
    controlRadius: number
    analogMax: number
    analogMap: Map<number, AnalogData>
}

interface TouchListenerObject extends EventListenerObject {
    touchpad: Touchpad
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

const constrainControl = (touchpadData: TouchpadData, analogData: AnalogData) => {
    const { clientWidth, clientHeight } = touchpadData.touchpad

    if (analogData.controlX < 0)
        analogData.controlX = 0
    else if (analogData.controlX > clientWidth)
        analogData.controlX = clientWidth

    if (analogData.controlY < 0)
        analogData.controlY = 0
    else if (analogData.controlY > clientHeight)
        analogData.controlY = clientHeight
}

const constrainDeadzone = (touchpadData: TouchpadData, analogData: AnalogData) => {
    const { controlRadius, touchpad } = touchpadData
    const { clientWidth, clientHeight } = touchpad
    const dx = analogData.controlX - analogData.deadzoneX
    const dy = analogData.controlY - analogData.deadzoneY
    const distance = Math.hypot(dx, dy)

    if (distance > controlRadius) {
        const scale = (distance - controlRadius) / distance

        analogData.deadzoneX += dx * scale
        analogData.deadzoneY += dy * scale
    }
}

const ponterDownListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (touchpadData.analogMap.size < touchpadData.analogMax) {
        touchpadData.touchpad.setPointerCapture(event.pointerId)

        const analogData = {
            pointerId: event.pointerId,
            deadzoneX: event.offsetX,
            deadzoneY: event.offsetY,
            controlX: event.offsetX,
            controlY: event.offsetY,
            analogX: 0,
            analogY: 0
        }

        touchpadData.analogMap.set(event.pointerId, analogData)

        constrainControl(touchpadData, analogData)
        constrainDeadzone(touchpadData, analogData)
    }
}

const ponterMoveListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (touchpadData.analogMap.size === 0) return

    const analogData = touchpadData.analogMap.get(event.pointerId)

    if (!analogData) return

    const { deadzoneRadius, controlRadius } = touchpadData
    let dx = analogData.controlX - event.offsetX
    let dy = analogData.controlY - event.offsetY
    let distance = Math.hypot(dx, dy)

    if (distance > controlRadius + deadzoneRadius) {
        const scale = (distance - controlRadius - deadzoneRadius) / distance

        analogData.controlX -= scale * dx
        analogData.controlY -= scale * dy

        constrainControl(touchpadData, analogData)
    }

    dx = analogData.deadzoneX - event.offsetX
    dy = analogData.deadzoneY - event.offsetY
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

const ponterUpListener = function (this: PointerListenerObject, event: PointerEvent) {
    this.touchpadData.touchpad.releasePointerCapture(event.pointerId)
    this.touchpadData.analogMap.delete(event.pointerId)
}

const defaultDeadzoneRadius = 8
const defaultControlRadius = 64
const TouchpadMap = new WeakMap<Touchpad, TouchpadData>

export class Touchpad extends HTMLElement {
    static observedAttributes = ['analogmax']

    constructor () {
        super()

        const touchpadData: TouchpadData = {
            touchpad: this,
            deadzoneRadius: defaultDeadzoneRadius,
            controlRadius: defaultControlRadius,
            analogMax: 0,
            analogMap: new Map
        }

        TouchpadMap.set(this, touchpadData)

        this.addEventListener('touchstart', { touchpad: this, handleEvent: touchstartListener } as TouchListenerObject)
        this.addEventListener('touchmove', { touchpad: this, handleEvent: touchmoveListener } as TouchListenerObject)
        this.addEventListener('touchend', { touchpad: this, handleEvent: touchendListener } as TouchListenerObject)
        this.addEventListener('touchcancel', { touchpad: this, handleEvent: touchcancelListener } as TouchListenerObject)
        this.addEventListener('pointerdown', { touchpadData, handleEvent: ponterDownListener } as PointerListenerObject)
        this.addEventListener('pointermove', { touchpadData, handleEvent: ponterMoveListener } as PointerListenerObject)
        this.addEventListener('pointerup', { touchpadData, handleEvent: ponterUpListener } as PointerListenerObject)
    }

    get deadzoneRadius () { return TouchpadMap.get(this).deadzoneRadius }
    set deadzoneRadius (radius) { TouchpadMap.get(this).deadzoneRadius = radius }

    get controlRadius () { return TouchpadMap.get(this).controlRadius }
    set controlRadius (radius) { TouchpadMap.get(this).controlRadius = radius }

    getAnalogData (pointerId: number) { return TouchpadMap.get(this).analogMap.get(pointerId) || null }

    attributeChangedCallback (name: string, oldValue: string, newValue: string) {
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
            //( as TouchpadData).analogMax = Number(newValue)
        }
    }

    connectedCallback () {
        const touchpadData = TouchpadMap.get(this)
        const root = this.attachShadow({ mode: 'closed' })
        root.innerHTML = `${TouchpadHTML}`
    }
}

customElements.define('touchpad-component', Touchpad)