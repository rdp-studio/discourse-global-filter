import { next, run } from "@ember/runloop";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

const ROUTES_TO_REDIRECT_ON = [
  "discovery.latest",
  "discovery.top",
  "discovery.unread",
  "discovery.category",
  "tag.show",
  "tags.intersection",
  "tags.showCategory",
];

export default {
  name: "global-filter-preference",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (!siteSettings.discourse_global_filter_enabled) {
      return;
    }

    const currentUser = container.lookup("current-user:main");
    const router = container.lookup("router:main");

    router.on("routeWillChange", (transition) => {
      if (transition.queryParamsOnly) {
        return;
      }

      const routeName = transition.to?.name;

      if (ROUTES_TO_REDIRECT_ON.includes(routeName)) {
        const globalFilters = siteSettings.global_filters.split("|");
        const tag = transition.to?.params?.tag_id;
        const additionalTags = transition.to?.params?.additional_tags;
        let filterPref;
        let tagCombination;

        if (additionalTags && tag) {
          tagCombination = additionalTags + `\${tag}`;
        }

        if (currentUser) {
          if (globalFilters.includes(tag)) {
            this._setClientAndServerFilterPref(tag, currentUser).then(() => {
              filterPref = this._setClientFilterPref(tag, currentUser);
              this._applyFilterStyles(filterPref, globalFilters);
              this._redirectToFilterPref(
                transition,
                router,
                filterPref,
                true,
                additionalTags || false
              );
            });
          } else {
            filterPref = currentUser.custom_fields.global_filter_preference;
            this._redirectToFilterPref(
              transition,
              router,
              filterPref || globalFilters[0],
              false,
              tagCombination || additionalTags || tag || false
            );
          }
        } else {
          if (globalFilters.includes(tag)) {
            filterPref = tag;
            this._applyFilterStyles(filterPref, globalFilters);
            this._redirectToFilterPref(
              transition,
              router,
              filterPref,
              true,
              additionalTags || false
            );
          } else {
            filterPref = globalFilters[0];
            this._applyFilterStyles(filterPref, globalFilters);
            this._redirectToFilterPref(
              transition,
              router,
              filterPref,
              false,
              tagCombination || additionalTags || tag || false
            );
          }
        }
      }
    });
  },

  _redirectToFilterPref(
    transition,
    router,
    filterPref,
    globalFilterPresent = true,
    additionalTags = false
  ) {
    if (transition.isAborted) {
      return;
    }

    let url;
    run(router, function () {
      const queryParams = transition?.to?.queryParams;

      if (!globalFilterPresent || transition.to.name === "tag.show") {
        if (additionalTags) {
          url = `/tags/intersection/${filterPref}/${additionalTags}`;
        } else {
          const categorySlug =
            transition.to?.params?.category_slug_path_with_id;
          const categoryURL = categorySlug ? `s/c/${categorySlug}` : "";
          url = `/tag${categoryURL}/${filterPref}`;
        }

        router.transitionTo(url, null, { queryParams });
      } else if (
        ROUTES_TO_REDIRECT_ON.includes(transition.intent?.targetName)
      ) {
        router.transitionTo(
          `/tag/${filterPref}/l/${transition.to.localName}`,
          null,
          { queryParams }
        );
      }
    });
  },

  _setClientAndServerFilterPref(tag, user) {
    return ajax(`/global_filter/filter_tags/${tag}/assign.json`, {
      type: "PUT",
      data: { user_id: user.id },
    })
      .then(() => this._setClientFilterPref(tag, user))
      .catch(popupAjaxError);
  },

  _setClientFilterPref(tag, user) {
    return user.set("custom_fields.global_filter_preference", tag);
  },

  _applyFilterStyles(filter, globalFilters = []) {
    globalFilters.filter((arg) => this._addOrRemoveFilterClass(arg, filter));
  },

  _addOrRemoveFilterClass(filter, globalFilter) {
    const filterBodyClass = `global-filter-tag-${filter}`;

    // since the dom content has not been rendered we have to schedule
    // the active class toggling since we need to know the stored filterPref
    // variable value for anon users
    if (filter === globalFilter) {
      this._addActiveFilter(filter);
      document.body.classList.add(filterBodyClass);
      return;
    }

    this._removeActiveFilter(filter);
    document.body.classList.remove(filterBodyClass);
  },

  _addActiveFilter(filter) {
    next(() => {
      document
        .getElementById(`global-filter-${filter}`)
        .classList.add("active");
    });
  },

  _removeActiveFilter(filter) {
    next(() => {
      document
        .getElementById(`global-filter-${filter}`)
        .classList.remove("active");
    });
  },
};
