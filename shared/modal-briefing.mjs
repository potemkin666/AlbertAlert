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
    copyBriefing,
    expandedBriefPanel,
    modalExpandedBrief,
    generateExpandedBrief,
    copyExpandedBrief
  } = elements;

  let currentAlert = null;

  function openDetail(alert) {
    if (!alert) return;
    currentAlert = alert;
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
    if (modalExpandedBrief) {
      modalExpandedBrief.textContent = 'Press Generate Long Brief to create a longer AI-written factual brief from the captured source text.';
    }
    if (expandedBriefPanel) expandedBriefPanel.hidden = false;
    if (generateExpandedBrief) {
      generateExpandedBrief.disabled = false;
      generateExpandedBrief.textContent = 'Generate Long Brief';
    }
    if (copyExpandedBrief) {
      copyExpandedBrief.disabled = true;
      copyExpandedBrief.dataset.brief = '';
      copyExpandedBrief.textContent = 'Copy Long Brief';
    }
    modalLink.href = alert.sourceUrl;
    copyBriefing.dataset.briefing = briefing;
    document.body.classList.add('modal-open');
    modal.classList.remove('hidden');
  }

  function closeDetailPanel() {
    currentAlert = null;
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
    copyTextToButton,
    getCurrentAlert() {
      return currentAlert;
    },
    setExpandedBrief(text) {
      if (!modalExpandedBrief || !copyExpandedBrief || !generateExpandedBrief) return;
      modalExpandedBrief.textContent = text;
      copyExpandedBrief.disabled = !cleanText(text);
      copyExpandedBrief.dataset.brief = text || '';
      generateExpandedBrief.textContent = 'Regenerate Long Brief';
    }
  };
}

function cleanText(value) {
  return String(value || '').trim();
}
