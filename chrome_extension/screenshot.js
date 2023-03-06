window.Screenshot = async function (tab) {
  const windowId = tab.windowId;
  return new Promise((res) => chrome.windows.get(windowId, { populate: true }, async function (window) {
    const width = window.tabs[0].width;
    const height = window.tabs[0].height;
    // set all position fixed => absolute, sticky => relative
    await chrome.scripting.executeScript({ 
      target: { tabId: tab.id }, 
      func: () => {
        const els = Array.from(document.querySelectorAll('*'));
        const positionTo = { 'fixed': 'absolute', 'sticky': 'relative'};
        document.body.style.overflow = 'hidden';
        for(const el of els) {
          if(el.style['position'] && ['fixed', 'sticky'].includes(el.style['position'])) {
            const position = el.style['position']
            el.style['position'] = positionTo[position];
            el.setAttribute('data-position',position);
          } else {
            const styles = getComputedStyle(el);
            const position = styles.getPropertyValue('position');
            if(position && ['fixed', 'sticky'].includes(position)) {
              el.style['position'] = positionTo[position];
              el.setAttribute('data-position',position);
            }
          }
        }
      }
    });
    
    console.log("window", width, height);
    // TODO: SCROLL TO TOP AND GET 
    const [{ result }] = await chrome.scripting.executeScript({ 
      target: { tabId: tab.id }, 
      func: () => {
        return document.body.scrollHeight;
      }
    });

    const canvas = document.createElement("canvas");
    canvas.height = 0;
    const context = canvas.getContext("2d");
    const times = Math.ceil(result / height);
    const Sleep = (n) => new Promise((res, rej) => setInterval(res, n))
    const screenShots = [];
    for(let i = 0, top = 0; i < times; i++, top += height) {
      await chrome.scripting.executeScript({ 
        target: { tabId: tab.id }, 
        func: (top) => {
          console.log('scrolltop', top);
          document.documentElement.scrollTop = top;
        },
        args: [top]
      });

      await Sleep(550);
      await new Promise((res, rej) => {
        chrome.tabs.captureVisibleTab(
          windowId,
          { format: "png" },
          function (dataUrl) {
            screenShots.push(dataUrl);
            return res(true);
          }
        );
      })
    }
    const getDataImageDIM = async (src) => {
      const img = new Image();
      img.src = src;
      return new Promise((res) => img.onload = () => {
        res([img.width, img.height]);
      });
    }

    const [screenshotWidth, screenshotHeight] = await getDataImageDIM(screenShots[0]);
    const canvasHeight = (screenshotHeight * result) / height;

    canvas.height = canvasHeight;
    canvas.width = screenshotWidth;

    for(let i = 0, top = 0; i < screenShots.length; i++, top += screenshotHeight) {
      const img = document.createElement("img");
      img.src = screenShots[i];

      if(i === screenShots.length - 1) top = canvasHeight - screenshotHeight;

      await new Promise((res) => {
          img.onload = () => {
            context.drawImage(img, 0, top);
            res(true);
          }
      })
    }
    const base64 = await res(canvas.toDataURL('image/png'));

    await chrome.scripting.executeScript({ 
      target: { tabId: tab.id }, 
      func: () => {
        const els = Array.from(document.querySelectorAll('[data-position]'));
        document.body.style.overflow = 'auto';
        for(const el of els) {
          el.style['position'] = el.getAttribute('data-position');
          el.removeAttribute('data-position');
        }
      }
    });
    return base64
  }));
};
