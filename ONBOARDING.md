# 入库指南 · 单锁证据的 A/B 出处对照

核验基线为 [main · febb2da](https://github.com/18926119195/diergbanben-/commit/febb2da5fe27de583e62cab52a3f1bc7a356b84e)，2026-11-19。

## 先复验一次证据回执

仓库保留一套 Docuverse 演示。用户从 PDF 候选中选主要证据并提交问题，页面同时显示模型写的出处和应用记录的入模回执。接手时沿「导入 PDF → 检索或圈选 → 冻结候选 → 构造请求 → 展示回执」跑一遍。两侧共用一次推理调用，所以这里的 A/B 表示两种出处视图。后续多路径网关实验在独立的 fanout 仓。详见 [产品入口](docuverse/src/App.tsx)、[出处对照](docuverse/src/ui/InterviewAbPanel.tsx)、[六库关系](MAINTAINERS.txt)。

| 要找的内容 | 入口 |
| --- | --- |
| 本地应用 | [docuverse/](docuverse/) · [启动参数](docs/CLONE.md) |
| 证据的身份、几何与序列化 | [pipelineA.ts](docuverse/src/reasoning/pipelineA.ts) · [bundle.ts](docuverse/src/reasoning/bundle.ts) · [llmClient.ts](docuverse/src/reasoning/llmClient.ts) |
| 历史和材料 | [时间线 D01–D06](DEVELOPMENT_HISTORY.txt) · [旧路径表](docs/archive/PATHS.txt) · [交付说明](docuverse/HANDOFF.md) |
| 离线复验 | [check-system.mjs](docuverse/scripts/check-system.mjs) · [GitHub Actions](.github/workflows/repository-check.yml) |

```sh
cd docuverse
npm ci --ignore-scripts
npm run build
npm run check:system
npm run dev
```

Node 24.22.1 下复验通过。离线检查覆盖圈选和检索锁的 key 与框、索引持久化、基础单锁 Bundle、Mock 及 HTTP 桩。开发界面设 `VITE_PUBLIC_DEMO=false` 可打开完整 Pilot。远端 OCR、真实模型和生产部署需另外记录验收结果。

## 从意图到实现

在可见分支 Git 历史、当前树和交付 ZIP 中未定位到本库原始对话。2026-08-24 入库的 fanout 对话记录了维护者追问两库关系，可补充旁路实验的来历。提交日期和原始讨论的日期分别记录。详见 [开发时间线](DEVELOPMENT_HISTORY.txt)、[fanout 对话中的关系追问](https://github.com/18926119195/diergbanben-fanout/blob/716939b9be634b2e4b53ab5644ef70942a5e20a4/chat%20history#L749)。

| 时间（北京时间） | 开发意图与基线状态 | 证据 |
| --- | --- | --- |
| 08-09 | 球面文献导航和强调搜索已进入应用。 | [034ebe5](https://github.com/18926119195/diergbanben-/commit/034ebe5fbbec5b4a17092f57aae2012561a9530e) |
| 08-16 至 08-17 | 圈选锁定现有 A1 对象，后续加入槽键、混合检索和本地索引回放。离线可复验。 | [0afde81](https://github.com/18926119195/diergbanben-/commit/0afde81901228443c804bf8503c6fdac41f1632e) · [3995fc9](https://github.com/18926119195/diergbanben-/commit/3995fc9e8fd5b48e0d072d0a26a647a9e5e55a1a) |
| 08-19 | 一轮推理生成 A 的引用和 B 的主依据回执。面板将其他候选摘录写入提问，基础 Bundle 的单锁检查覆盖的是 Bundle 构造层。 | [08a712e](https://github.com/18926119195/diergbanben-/commit/08a712e2002f1368a883009eb104ee3ad2e4cd79) · [面板请求与回执](docuverse/src/ui/InterviewAbPanel.tsx#L240-L329) |
| 11-19 | 构建修复、历史导航和离线检查已进入默认分支。 | [PR #1](https://github.com/18926119195/diergbanben-/pull/1) |

## 下一项工作 · 验证 A/B 面板的最终请求

借用钱学森《工程控制论》的反馈思想，将目标、观测、偏差和纠偏落到同一份回放记录。

1. 固定包含两个可区分槽的 PDF 夹具、问题和候选顺序。选择槽 B，使用 HTTP 桩拦截实际请求并固定模型回包的出处编号。保留所选槽的 key、页、框和最小必要摘录。
2. 从正常面板入口提交一次。分别登记 A 的模型引用或检索回退、B 的冻结槽、最终 `messages` 出现的所有槽和 fetch 次数。验收要求只调用一次模型，B 的 key 与页框始终等于所选槽，回退引用可从日志辨认。
3. 若请求含额外候选，把结论记为「主依据已绑定，候选目录也入模」。由维护者裁定保留目录供对照，或将请求收紧为单槽。收紧方案必须通过最终序列化文本的反例检查，夹具的另一槽标记出现即失败。同时复跑原有 Mock 和索引检查。
4. PR 记录 D04、基线提交、固定输入、预期、实测和回退点。维护者审核后将结果补入 D04 或 OPEN。入口回执或来源映射出现回归时，停用该变更并在同一夹具上复验后恢复。

模型内部证据使用、生产调用稳定性与多 Agent 编排仍缺本库验收证据。

## 方法依据

本指南把总体设计落实为边界、目标和任务接口，把工程控制中的反馈落实为观测、判据和纠偏。维护者用原始协作记录、代码和固定样本共同核验定性判断与量化结果，据此决定下一轮行动。[《工程控制论》](https://openlibrary.org/books/OL49218199M/Engineering_cybernetics) · [《组织管理的技术——系统工程》](https://doi.org/10.13255/j.cnki.jusst.2011.06.020) · [《一个科学新领域——开放的复杂巨系统及其方法论》](https://cnki.istiz.org.cn/kcms/detail/detail.aspx?dbcode=CPFD&dbname=cpfd1999&filename=ZGXC199008001001)
