const server = Bun.serve({
    // `routes` requires Bun v1.2.3+
    routes: {
        // Serve a file by lazily loading it into memory
        "/": Bun.file("./www/index.html"),
        "/node_modules/@dandre3000/touchpad-web-component/build/touchpad.js": Bun.file(new URL("./build/touchpad.js", import.meta.url), { type: 'text/javascript' })
    }
})

console.log(`Server running at ${server.url}`)