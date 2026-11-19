首次接手可从[入库指南](ONBOARDING.md)了解仓库用途，沿聊天追踪灵感与实现状态，也可从代码反查设计来由。

## 先看这里

**第一次访问这个仓库，请从此处开始。** 这个仓库的工程目标是同题 A/B 演示的出处可逐项核对。

- [开发聊天、实现沿革和代码定位](DEVELOPMENT_HISTORY.txt) 按菜单编号阅读。每项可回到原句、Git 提交、源码行及验证结果。
- [维护入口与六库关系](MAINTAINERS.txt) 用来定位应用入口、同类实验和读码顺序。
- [历史文件路径](docs/archive/PATHS.txt) 用来回查原件搬迁和内容相同的旧路径。
- [六库总菜单](https://github.com/18926119195/docuverse/blob/main/MAINTAINERS.txt) 按要解决的问题选择仓库。

### 怎样观测和纠偏

借用钱学森《工程控制论》的工程视角，把开发目标、输入、可观测状态、反馈和纠偏落实到协作与验收。每次变更都应能沿这条链回查。

| 项目 | 本仓库的检查点 |
| --- | --- |
| 输入 | 相同问题、候选槽、手选依据 |
| 输出 | 两侧输入、所选主依据及回执 |
| 可观测验收 | 单锁夹具中圈内 key 与请求体一致，基础 Bundle 排除圈外样本 |
| 偏差处理 | 核对 A/B 时分别记录最终序列化请求、主依据和追加候选摘录。两侧材料边界有变化时，在同一问句上重放后再更新结论。 |

进入 `docuverse/`运行以下命令。当前离线夹具覆盖圈选与检索锁、索引回放、单锁 Bundle、Mock 和模拟 HTTP 请求。真实模型、OCR 和生产部署的行为需要有相应环境才能验证。

```sh
cd docuverse
npm ci --ignore-scripts
npm run build
npm run check:system
```

提交 PR 时附时间线编号、基线提交、实际入口、预期与实测。如果实测偏离预期，用同一输入记录最小复现并附相关台账或模型请求中的非敏感字段。行为修正通过同一检查后，将决定、代码和结果补回时间线。已发布版本出现回归时，先保留失败证据，再由维护者评估回退对应变更或修正向前。

---

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
