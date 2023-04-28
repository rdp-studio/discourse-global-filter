import I18n from "I18n";
import {
  Promise
} from "rsvp";
import {
  withPluginApi
} from "discourse/lib/plugin-api";

export default {
  name: "require-tag-on-topic-creation",

  initialize(container) {
    const siteSettings = container.lookup("service:site-settings");
    if (siteSettings.discourse_global_filter_enabled) {
      withPluginApi("1.3.0", (api) => {
        api.modifyClass("route:discovery", {
          pluginId: "prefill-composer-tags",
          actions: {
            createTopic() {
              try {
                const hasDraft = this.currentUser?.has_topic_draft;
                if (hasDraft) {
                  this._super(...arguments);
                  return;
                } else {
                  const controller = this.controllerFor("discovery/topics");
                  const composerController = this.controllerFor("composer");
                  const categoryId = controller.category?.id;
                  const categorySlug = controller.category?.slug;
                  try {
                    var tag = router.currentRoute?.queryParams?.tag || "sq";
                  } catch {
                    var tag = "sq";
                  }

                  composerController
                    .open({
                      categoryId: categoryId,
                      action: Composer.CREATE_TOPIC,
                      draftKey: Composer.NEW_TOPIC_KEY
                    })
                    .then(() => {
                      if (composerController.canEditTags && categoryId) {
                        const composerModel = composerController.model;
                        composerModel.set(
                          "tags",
                          makeArray([tag]).filter(Boolean)
                        );
                      }
                    });
                }
              } catch {
                this._super(...arguments);
                return;
              }
            }
          }
        });
        api.composerBeforeSave(() => {
          return new Promise((resolve, reject) => {
            const composerModel = api.container.lookup(
              "controller:composer"
            ).model;

            // only require tags when creating a regular topic
            // i.e. skip validation for PMs, replies, edits, etc.
            if (
              composerModel.action !== "createTopic" ||
              composerModel.archetypeId !== "regular"
            ) {
              return resolve();
            }
            const globalFilters = api.container
              .lookup("site-settings:main")
              .global_filters.split("|");

            if (
              composerModel.tags.filter((tag) => globalFilters.includes(tag))
              .length > 0
            ) {
              return resolve();
            } else {
              const dialog = api.container.lookup("service:dialog");
              dialog.alert(
                I18n.t("global_filter.require_tag_on_topic_creation.error")
              );
              return reject();
            }
          });
        });
      });
    }
  },
};
