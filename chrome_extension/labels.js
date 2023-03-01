window.getLabels = async function (tab) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const allAnnotations = document.querySelectorAll(
        "[data-remark-annotation]"
      );
      let labels = "";
      const [dw, dh] = [
        1.0 / document.body.scrollWidth,
        1.0 / document.body.scrollHeight,
      ];
      const getBox = (annotation) => {
        let { x, y, width, height } = annotation.getBoundingClientRect();
        return [x, x + width, y, y + height];
      };
      for (const annotation of allAnnotations) {
        const box = getBox(annotation);
        const type = annotation.getAttribute("data-remark-annotation");
        const [x, y, w, h] = [
          ((box[0] + box[1]) / 2.0) * dw,
          ((box[2] + box[3]) / 2.0) * dh,
          (box[1] - box[0]) * dw,
          (box[3] - box[2]) * dh,
        ];
        labels += `${type} ${[x, y, w, h].join(" ")}\n`;
      }
      return labels;
    },
  });
  return result;
};
