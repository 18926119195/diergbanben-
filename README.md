# Docuverse 单锁出处对照试点

本仓库包含 PDF 页面、圈选锁定、混合检索以及同一轮推理的 A/B 出处对照。

| 位置 | 内容 |
| --- | --- |
| [`docuverse/`](./docuverse/) | Vite 应用。入口是 [`src/App.tsx`](./docuverse/src/App.tsx)，其中挂载 A/B 对照面板和单锁试点。 |
| [`docuverse/src/reasoning/`](./docuverse/src/reasoning/) | 位置索引、混合检索、送模编包和本地推理记录。 |
| [`docs/`](./docs/README.md) | 工程规格和设计材料。启动命令见 [克隆与运行](./docs/CLONE.md)。 |
| [`patent-ocr/`](./patent-ocr/) | 专利 OCR 文本和配套规格。 |
| [`pages/`](./pages/) | 根目录页图资料。应用使用的页图副本位于 [`docuverse/public/pdf-pages/`](./docuverse/public/pdf-pages/)。 |
| [`docuverse-demo-handoff.zip`](./docuverse-demo-handoff.zip) | 交付归档。开发从 `docuverse/` 源码目录启动。 |

网关与多路径推理的后续实验位于独立的 [diergbanben-fanout 仓库](https://github.com/18926119195/diergbanben-fanout)。
