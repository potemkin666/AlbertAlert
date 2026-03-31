export function createModalController(elements, deps) {
  const {
    modal,
    modalTitle,
    modalMeta,
    modalAiSummary,
    modalSummary,
    modalSceneClock,
    modalConfidenceLadder,
    sceneClockPanel,
    confidenceLadderPanel,
    modalAudit,
    modalCorroboration,
    auditPanel,
    corroborationPanel,
    modalSeverity,
    modalStatus,
    modalSource,
    modalRegion,
    modalBriefing,
    modalLink,
    copyBriefing
  } = elements;

  function openDetail(alert) {
    if (!alert) return;
    const summaryText = deps.effectiveSummary(alert);
    const briefing = deps.buildBriefing(alert, summaryText);
    modalTitle.textContent = alert.title;
    modalMeta.textContent = `${alert.location} | ${alert.time}`;
    modalAiSummary.textContent = summaryText;
    modalSummary.textContent = '';
    modalSummary.hidden = true;
    modalSceneClock.innerHTML = deps.renderSceneClock(alert);
    sceneClockPanel.hidden = false;
    modalConfidenceLadder.innerHTML = deps.renderConfidenceLadder(alert);
    confidenceLadderPanel.hidden = false;
    modalAudit.textContent = deps.buildAuditBlock(alert);
    modalCorroboration.innerHTML = deps.renderCorroboratingSources(alert);
    auditPanel.hidden = false;
    corroborationPanel.hidden = false;
    modalSeverity.textContent = deps.severityLabel(alert.severity);
    modalStatus.textContent = alert.status;
    modalSource.textContent = alert.source;
    modalRegion.textContent = alert.region === 'uk' ? 'United Kingdom' : 'Europe';
    modalBriefing.textContent = briefing;
    modalLink.href = alert.sourceUrl;
    copyBriefing.dataset.briefing = briefing;
    document.body.classList.add('modal-open');
    modal.classList.remove('hidden');
  }

  function closeDetailPanel() {
    document.body.classList.remove('modal-open');
    modal.classList.add('hidden');
  }

  async function copyTextToButton(text, button, idleLabel) {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed';
    }
    setTimeout(() => {
      button.textContent = idleLabel;
    }, 1200);
  }

  return {
    openDetail,
    closeDetailPanel,
    copyTextToButton
  };
}
