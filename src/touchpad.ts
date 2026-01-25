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

const ponterDownListener = function (this: PointerListenerObject, event: PointerEvent) {
    if (this.touchpadData.analogMap.size < this.touchpadData.analogMax) this.touchpadData.analogMap.set(event.pointerId, {
        pointerId: event.pointerId,
        deadzoneX: event.pageX,
        deadzoneY: event.pageY,
        controlX: event.pageX,
        controlY: event.pageY,
        analogX: 0,
        analogY: 0
    })
}

const ponterMoveListener = function (this: PointerListenerObject, event: PointerEvent) {
    const analogData = this.touchpadData.analogMap.get(event.pointerId)

    if (!analogData) return

    const { deadzoneRadius, controlRadius } = this.touchpadData
    let a = analogData.deadzoneX - event.pageX
    let b = analogData.deadzoneY - event.pageY
    let distance = Math.sqrt(a * a + b * b)

    if (distance > this.touchpadData.deadzoneRadius) {
        const ratio = (distance - this.touchpadData.deadzoneRadius) / distance

        analogData.deadzoneX -= a * ratio
        analogData.deadzoneY -= b * ratio
    }

    a = analogData.controlX - event.pageX
    b = analogData.controlY - event.pageY
    distance = Math.sqrt(a * a + b * b)

    if (distance > controlRadius) {
        const ratio = (distance - controlRadius) / distance

        analogData.controlX -= ratio * a
        analogData.controlY -= ratio * b
    }

    analogData.analogX = (analogData.deadzoneX - analogData.controlX) / (controlRadius - deadzoneRadius)
    analogData.analogY = (analogData.deadzoneY - analogData.controlY) / (controlRadius - deadzoneRadius)
}

const ponterUpListener = function (this: PointerListenerObject, event: PointerEvent) {
    this.touchpadData.analogMap.delete(event.pointerId)
}

const TouchpadMap = new WeakMap<Touchpad, TouchpadData>

class Touchpad extends HTMLElement {
    static observedAttributes = ['analogmax']

    constructor () {
        super()

        const touchpadData = {
            touchpad: this,
            deadzoneRadius: 8,
            controlRadius: 64,
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