declare module 'qrcode' { const QRCode: {toCanvas(canvas:HTMLCanvasElement,text:string,options?:Record<string,unknown>):Promise<void>}; export default QRCode; }
