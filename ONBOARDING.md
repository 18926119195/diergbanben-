# 入库指南 · 单锁证据与出处对照

[一分钟定位](#一分钟定位) · [沿聊天时间线看灵感](#沿聊天时间线看灵感) · [从代码反查来由](#从代码反查来由) · [走读与维护记录](#走读与维护记录)

## 一分钟定位

这里是 Docuverse 的 PDF 证据对照演示。选中一个 A1 槽（带页码与边框的证据对象）后，页面用一次推理显示两种出处：A 展示模型写出的引用或检索首项，B 回放用户选的主要证据。应用在 [docuverse/](https://github.com/18926119195/diergbanben-/tree/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse)，模型客户端与页面同在此目录。后续 fanout 实验是另一仓库。基线为 [main · febb2da](https://github.com/18926119195/diergbanben-/commit/febb2da5fe27de583e62cab52a3f1bc7a356b84e)。

## 沿聊天时间线看灵感

**如何读状态。** 已实现表示在所列版本找到与灵感相符的代码路径。部分实现表示已有其中一段。未实现表示已查的入口尚无对应实现。证据不足时标待确认。归档与设计文稿按资料本身的状态描述。

在本库可达 Git 历史、当前树和交付 ZIP 中未找到本库的完整聊天原件。根目录「我的理念」为空文件。8 月 9 日至 19 日是提交留下的实现时间，提出想法的时间无法判定。8 月 24 日能定位到后续实验的用户提问，日期为对话导出的入库日期。出处说明见 [开发时间线 D01–D06](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/DEVELOPMENT_HISTORY.txt)。

| 编号与时间（2026 年，北京） | 原始线索与想法 | 基线状态 | 实现证据 |
| --- | --- | --- | --- |
| <a name="idea-i01"></a>I01 · 08-09 | 初始提交记录球面文献工作区。把页图、强调标注和文档导航放在一个空间里。 [提交 034ebe5](https://github.com/18926119195/diergbanben-/commit/034ebe5fbbec5b4a17092f57aae2012561a9530e) | **已实现**。根视图挂载球面、导航和上传等入口。 | [应用入口](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/App.tsx#L16-L32) |
| <a name="idea-i02"></a>I02 · 08-16 | 推理试点提交要求圈选先落到已有 A1 文本槽，再将槽证据交入推理。 [提交 0afde81](https://github.com/18926119195/diergbanben-/commit/0afde81901228443c804bf8503c6fdac41f1632e) | **已实现**。圈选筛选页内原子，基础单锁 Bundle 用所选槽组装，离线检查覆盖圈外样本排除。 | [圈选与锁](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/reasoning/pipelineA.ts#L660-L699) · [基础编包](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/reasoning/bundle.ts#L8-L51) · [离线检查](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/scripts/check-system.mjs) |
| <a name="idea-i03"></a>I03 · 08-17 | 槽流水线提交加入按问题找候选，并保留原有槽身份和页框。 [提交 3995fc9](https://github.com/18926119195/diergbanben-/commit/3995fc9e8fd5b48e0d072d0a26a647a9e5e55a1a) | **已实现**。检索以已登记槽为候选，融合向量或词法评分与 BM25。索引可在浏览器保存和回放。 | [槽检索](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/reasoning/pipelineA.ts#L712-L810) · [索引存储](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/reasoning/bookIndexStore.ts#L61-L105) |
| <a name="idea-i04"></a>I04 · 08-19 | 交付版本增加出处对照台，以同一问题查看模型自报的引用和系统记录的主要证据。 [提交 08a712e](https://github.com/18926119195/diergbanben-/commit/08a712e2002f1368a883009eb104ee3ad2e4cd79) | **已实现**。一次调用完成后，A 取引用编号或检索首项，B 用冻结的所选槽。 | [选择、请求与两侧记录](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/ui/InterviewAbPanel.tsx#L240-L329) |
| <a name="idea-i05"></a>I05 · 08-19 | 厂商规格的演示更新提出对照「AI 吃进了什么」与原件。 [工程规格](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docs/%E5%86%85%E7%A6%80%E5%9D%90%E6%A0%87%E4%B8%8E%E6%8C%87%E5%90%91%E6%80%A7%E6%8E%A8%E7%90%86%E6%8E%A7%E5%88%B6-%E5%A4%A7%E6%A8%A1%E5%9E%8B%E5%8E%82%E5%95%86%E5%B7%A5%E7%A8%8B%E8%A7%84%E6%A0%BC.md) | **部分实现**。B 持有单一主证据，A/B 面板将其他候选短摘拼进问题。最终发出的内容比高亮的单一主证据多。 | [构造问题](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/ui/InterviewAbPanel.tsx#L36-L54) · [出站消息](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/reasoning/llmClient.ts#L55-L85) |
| <a name="idea-i06"></a>I06 · 08-19 规格更新 | 厂商规格提出在推理侧编译 Attention Mask，让片段可见性受控制。 [厂商规格](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docs/%E5%86%85%E7%A6%80%E5%9D%90%E6%A0%87%E4%B8%8E%E6%8C%87%E5%90%91%E6%80%A7%E6%8E%A8%E7%90%86%E6%8E%A7%E5%88%B6-%E5%A4%A7%E6%A8%A1%E5%9E%8B%E5%8E%82%E5%95%86%E5%B7%A5%E7%A8%8B%E8%A7%84%E6%A0%BC.md#L603-L611) | **未落地**。当前客户端将证据写入文本请求，没看到服务侧掩码编译。 | [出站消息](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/reasoning/llmClient.ts#L55-L85) |
| <a name="idea-i07"></a>I07 · 08-24 入库 | 用户在后续对话追问 fanout 与原库的关系和是否应推回。 [fanout 对话第 749 行](https://github.com/18926119195/diergbanben-fanout/blob/716939b9be634b2e4b53ab5644ef70942a5e20a4/chat%20history#L749) | **未落地于本库**。fanout 的独立网关实验可在后续仓库追踪。本库入口仍是原出处对照面板。 | [本库根视图](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/App.tsx#L16-L32) · [旁路仓初始提交](https://github.com/18926119195/diergbanben-fanout/commit/9a94415ea976c2eb3b9afff334456bf84fc65bc0) |

## 从代码反查来由

| 第一次读到的代码 | 它来自哪段想法 |
| --- | --- |
| [App.tsx](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/App.tsx) 同时挂载球面与出处对照 | [I01](#idea-i01) 提供空间与交互底座，[I04](#idea-i04) 在原应用上叠加对照。 |
| [pipelineA.ts](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/reasoning/pipelineA.ts) 的圈选与检索命中都能给出槽和框 | [I02](#idea-i02)、[I03](#idea-i03) 共用证据对象，选中框能回到 PDF。 |
| [InterviewAbPanel.tsx](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/ui/InterviewAbPanel.tsx) 的 `buildDemoQuestion` 和模型调用 | [I04](#idea-i04) 解释为什么只有一次调用，[I05](#idea-i05) 解释为什么「B 显示一条」时请求仍可能有其他摘录，[I06](#idea-i06) 解释这一层与模型内控制的边界。 |

## 走读与维护记录

打开 `runInfer` 所在的 [面板提交段](https://github.com/18926119195/diergbanben-/blob/febb2da5fe27de583e62cab52a3f1bc7a356b84e/docuverse/src/ui/InterviewAbPanel.tsx#L240-L329)，从 `chosen` 跟到 `buildDemoQuestion`、`callLlmWithBundle`，再回到两个回溯记录。读完应能指出哪一侧由模型返回编号、哪一侧来源于用户选择、在哪里看到其他候选进入请求。本轮以 Node 24 复跑 `docuverse/` 下的构建与离线系统检查。若发现某条对话或源码对应有误，按 I 编号补原始发言或可定位记录、提交和修正理由，更新该条状态。

**指南如何更新。** 以仓库和版本划定范围，从聊天提取原始目标，再用代码与产物校正对当时决策的理解。新证据出现时，回到原编号修订记录。这种读法借鉴了钱学森的系统工程和工程控制论。 [《组织管理的技术——系统工程》](https://doi.org/10.13255/j.cnki.jusst.2011.06.020) · [《工程控制论》](https://openlibrary.org/books/OL49218199M/Engineering_cybernetics)
