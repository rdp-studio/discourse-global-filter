import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class GlobalFilterComposerContainer extends Component {
  @service router;
  @service site;
  @service siteSettings;

  constructor(owner, args) {
    super(owner, args);
    if (this.siteSettings.display_global_filters_as_dropdown_in_composer) {
      if (!this.args.value) {
        try {
          this.args.value = this.args.composer.tags || [this.router.currentRoute?.queryParams?.tag];
        } catch {
          this.args.value = [this.router.currentRoute?.queryParams?.tag];
        }
      }
    }
  }
  
  tagParam = this.router.currentRoute?.queryParams?.tag;

  get canDisplay() {
    return (
      (this.args.composer.creatingTopic === true &&
        !this.args.composer.creatingPrivateMessage) ||
      (this.args.composer.editingFirstPost === true &&
        !this.args.composer.privateMessage)
    );
  }

  get globalFilters() {
    return this.site.global_filters;
  }
}
