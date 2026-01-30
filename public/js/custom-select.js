/**
 * Custom Select System
 * Replaces native <select> with a stylable UI
 */

const CustomSelect = {
    init() {
        this.observeDOM();
        this.updateAll();
    },

    updateAll() {
        document.querySelectorAll('select:not(.custom-select-hidden):not(.no-custom)').forEach(select => {
            if (select.closest('.note-toolbar')) return;
            this.create(select);
        });
    },

    create(select) {
        if (select.classList.contains('custom-select-hidden')) return;
        if (select.classList.contains('no-custom')) return;
        if (select.closest('.note-toolbar')) return;

        // Hide original select
        select.classList.add('custom-select-hidden');
        
        // Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        if (select.id) wrapper.id = 'custom-wrapper-' + select.id;
        
        // Trigger (the visible box)
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        const selectedText = select.options[select.selectedIndex]?.text || 'Seleccionar...';
        trigger.innerHTML = `<span>${selectedText}</span>`;
        
        // Options Container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';
        
        // Populating Options
        this.refreshOptions(select, optionsContainer, trigger);

        // Assemble
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);

        // Click Event - Toggle Open
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.contains('open');
            this.closeAll(); // Close others first
            if (!isOpen) {
                document.body.appendChild(optionsContainer); // Move to body
                
                // Show temporarily to measure
                optionsContainer.style.visibility = 'hidden';
                optionsContainer.classList.add('open'); 
                
                this.reposition(trigger, optionsContainer);
                
                optionsContainer.style.visibility = 'visible';
                wrapper.classList.add('open');
            }
        });

        // Close when clicking outside or scrolling
        document.addEventListener('click', () => this.closeAll());
        window.addEventListener('resize', () => this.closeAll());
        // Scroll listener might be too aggressive if we simply closeAll.
        // User didn't complain about scrolling, but "reposition on scroll" is better.
        // For now, keep closeAll on scroll as it's simpler and standard for this codebase.
        window.addEventListener('scroll', () => this.closeAll(), true); 

        // Sync back when native select changes (e.g. via other JS)
        const observer = new MutationObserver(() => this.syncFromNative(select, trigger, optionsContainer));
        observer.observe(select, { childList: true, subtree: true, attributes: true });
        
        select.addEventListener('change', () => this.syncFromNative(select, trigger, optionsContainer));
    },

    refreshOptions(select, container, trigger) {
        container.innerHTML = '';
        Array.from(select.options).forEach(opt => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            if (opt.selected) optionDiv.classList.add('selected');
            optionDiv.textContent = opt.text;
            optionDiv.dataset.value = opt.value;

            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                this.closeAll();
            });

            container.appendChild(optionDiv);
        });
    },

    syncFromNative(select, trigger, container) {
        const textSpan = trigger.querySelector('span');
        if (textSpan) textSpan.textContent = select.options[select.selectedIndex]?.text || 'Seleccionar...';
        
        this.refreshOptions(select, container, trigger);
    },

    reposition(trigger, container) {
        const rect = trigger.getBoundingClientRect();
        const containerHeight = container.offsetHeight;
        const viewportHeight = window.innerHeight;
        
        container.style.position = 'absolute';
        container.style.width = rect.width + 'px';
        container.style.zIndex = '50000'; // Super high to be above modals (10000)
        container.style.left = (rect.left + window.scrollX) + 'px';

        // Check space below
        const spaceBelow = viewportHeight - rect.bottom;
        
        // If not enough space below (less than height + padding) AND more space above
        if (spaceBelow < containerHeight && rect.top > containerHeight) {
            // Position Above
            container.style.top = (rect.top + window.scrollY - containerHeight) + 'px';
            container.classList.add('open-up');
            container.classList.remove('open-down');
        } else {
            // Position Below (Default)
            container.style.top = (rect.bottom + window.scrollY) + 'px';
            container.classList.add('open-down');
            container.classList.remove('open-up');
        }
    },

    closeAll() {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.custom-options.open').forEach(o => {
            o.classList.remove('open');
            o.classList.remove('open-up'); // Clean up direction classes
            o.classList.remove('open-down');
            o.style.visibility = ''; // Reset visibility
            o.remove(); 
        });
    },

    observeDOM() {
        // Watch for new selects added dynamically (like in modales)
        const bodyObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'SELECT') this.create(node);
                        node.querySelectorAll('select').forEach(s => this.create(s));
                    }
                });
            });
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
};

// Auto-initialize when script loads or DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CustomSelect.init());
} else {
    CustomSelect.init();
}
