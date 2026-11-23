let canvas,context,adapter,device;
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
}
init();