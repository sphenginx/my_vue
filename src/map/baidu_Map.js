export default {
    async init () {
        const AK = "tC4pGBT3ObEcpw0fp5BT8cvr9RmKRG0E";
        const apiVersion = "2.0";
        const curProtocol = "https:" == document.location.protocol ? " https://" : " http://";
        const BMap_URL = `${curProtocol}api.map.baidu.com/api?v=${apiVersion}&ak=${AK}&callback=onBMapCallback`;
        await new Promise((resolve, reject) => {
            // 如果已加载直接返回
            if(typeof BMap !== "undefined") {
                // console.log("百度地图脚本已经初始化...");
                resolve();
                return true;
            }
            // 百度地图异步加载回调处理
            window.onBMapCallback = function () {
                // console.log("百度地图脚本初始化成功...");
                resolve();
            };
            this.loadScript(BMap_URL);
        });
    }, 
    loadScript (src) {
        // 插入script脚本
        let scriptNode = document.createElement("script");
        scriptNode.setAttribute("type", "text/javascript");
        scriptNode.setAttribute("src", src);
        document.body.appendChild(scriptNode);
    }
}  