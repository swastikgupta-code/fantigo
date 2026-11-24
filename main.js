let canvas,context,adapter,device,pipeline;
let data = new Float32Array(8);
let last_time = 0.0;
async function init()
{
    canvas = document.getElementById("gpucanvas");
    context = canvas.getContext("webgpu");
    adapter = await navigator.gpu.requestAdapter();
    device = await adapter.requestDevice();
    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "opaque"
    });
    let [vert_shader, frag_shader] = await Promise.all([
        fetch("./vertex.wgsl").then((res) => res.text()),
        fetch("./fragment.wgsl").then((res) => res.text()),
    ]);
    vert_shader = device.createShaderModule({code: vert_shader});
    frag_shader = device.createShaderModule({code: frag_shader});
    pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: vert_shader,
            entryPoint: "vert_main"
        },
        fragment: {
            module: frag_shader,
            entryPoint: "frag_main",
            targets: [{format: navigator.gpu.getPreferredCanvasFormat()}]
        },
        primitive: {
            topology: "triangle-list"
        }
    });
    requestAnimationFrame(render);
}
function render(time)
{
    time = time * 0.001;
    if(last_time==0.0) last_time = time;
    let delta_time = time - last_time;
    data[0] = canvas.width/canvas.height;
    data[1] = 1.0;
    data[2] = time;
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view: textureView,
                clearValue: {r: 0,g: 0,b: 0.4,a: 1.0},
                loadOp : "clear",
                storeOp: "store"
            }
        ]
    });
    renderPass.setPipeline(pipeline);
    renderPass.draw(6);
    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
    last_time=time;
    requestAnimationFrame(render);
}
init();