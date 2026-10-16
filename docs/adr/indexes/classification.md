# 决定记录的性质分类

本页是完整分类参考，非任务启动必读。Core不是全局必读清单；相关性先按任务主题筛选。Declared status与此类目、实际交付三者分开。

## Audit Classification

| Class | Count | Share |
| --- | ---: | ---: |
| Core | 89 | 18.02% |
| Supporting | 201 | 40.69% |
| Spec-candidate | 195 | 39.47% |
| Historical | 9 | 1.82% |
| Total | 494 | 100% |

### Core ADRs

```text
0001–0003, 0005, 0009, 0011, 0013–0016, 0018–0019, 0033, 0037,
0060, 0064, 0066–0067, 0071, 0088, 0097, 0105–0106, 0111, 0114,
0137, 0140–0145,
0161, 0165, 0168–0169, 0173–0174, 0178–0179, 0181–0187, 0193,
0275–0276, 0278–0284, 0292–0297, 0301, 0303–0305, 0309, 0314,
0319–0320,
0335, 0340, 0348, 0351, 0357–0358, 0383, 0404–0406, 0413–0414,
0482–0486, 0491
```

### Spec-candidate ADRs

```text
0021, 0023–0025, 0027, 0029–0030, 0035–0036, 0038, 0044, 0046,
0049–0050, 0053, 0056–0057, 0062, 0070, 0076, 0081, 0084–0085,
0087, 0089, 0092, 0095, 0098, 0104, 0109, 0113, 0132, 0134,
0146, 0148–0149, 0154,
0204–0205, 0207–0215, 0217–0220, 0223–0274, 0286–0291,
0329–0334, 0336–0338, 0343, 0345–0347, 0349, 0354–0356,
0359–0361, 0363–0370, 0379, 0381, 0384–0392, 0394–0399,
0407–0412, 0425–0431, 0434, 0446–0454, 0456–0457, 0459–0460,
0462–0464, 0466–0471, 0478–0481
```

Every ADR not listed as Core, Spec-candidate, or Historical is Supporting.
This classification is a reading route, not permission to rewrite or delete.

### Historical ADRs

| ADR | Current replacement |
| --- | --- |
| 0010 | ADR 0483 retires embedded web collection; the old staged-retention text remains historical. |
| 0012 | ADR 0026 replaces the right-side Capture Inbox placement. |
| 0121 | ADR 0123 requires automatic System Preview before Promotion. |
| 0323–0328 | ADR 0348 rejects cross-format current-source replacement and keeps outputs source-separated. |

