import _ from "lodash";
import Promise from "bluebird";

export default class TagMapping {

  constructor(intercomAgent, hullAgent, ship) {
    this.ship = ship;
    this.hullAgent = hullAgent;
    this.intercomClient = intercomAgent.intercomClient;

    this.settingKey = "tag_mapping";
    this.mapping = _.get(this.ship, `private_settings[${this.settingKey}]`, {});
    this.originalMapping = _.cloneDeep(this.mapping);
  }

  getSegmentIds() {
    return _.keys(this.mapping);
  }

  getTagIds() {
    return _.values(this.mapping);
  }

  /**
   * @return Promise
   */
  persist() {
    if (_.isEqual(this.originalMapping, this.mapping)) {
      return Promise.resolve();
    }
    const newSettings = {};
    newSettings[this.settingKey] = this.mapping;
    return this.hullAgent.updateShipSettings(newSettings);
  }

  /**
   * @param {Array} segments array of segments the tags should be sync to
   * @return Promise
   */
  sync(segments = []) {
    const mappedSegments = _.keys(this.mapping).map(id => { return { id }; });
    const newSegments = _.differenceBy(segments, mappedSegments, "id");
    const oldSegments = _.differenceBy(mappedSegments, segments, "id");

    return Promise.map(newSegments, segment => {
      return this.createTag(segment);
    }, { concurrency: 1 })
    .then(() => {
      return Promise.map(oldSegments, segment => {
        return this.deleteTag(segment);
      }, { concurrency: 3 });
    })
    .then(() => this.persist());
  }

  /**
   * Creates new tag for selected segment
   *
   * @param {Object} segment { id, name }
   * @return Promise
   */
  createTag(segment) {
    return this.intercomClient
      .post("/tags")
      .send({
        name: segment.name
      })
      .then(({ body = {} }) => {
        this.mapping[segment.id] = body.id;
        return body;
      });
  }

  /**
   * Deletes tag mapped for provided segment
   *
   * @param {Object} segment { id, name }
   * @return {Promise}
   */
  deleteTag(segment) {
    const tagId = _.get(this.mapping, segment.id);

    if (!tagId) {
      return Promise.resolve();
    }

    return this.intercomClient
      .delete(`/tags/${tagId}`)
      .then(() => {
        _.unset(this.mapping, segment.id);
        return Promise.resolve();
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);

        if (fErr.statusCode === 404) {
          _.unset(this.mapping, segment.id);
          return Promise.resolve();
        }

        if (fErr.statusCode === 400) {
          this.hullAgent.hullClient.logger.error("sync.error", {
            error: "Unable to delete tag",
            segment: segment.id,
            tag_id: tagId
          });
          _.unset(this.mapping, segment.id);
          return Promise.resolve();
        }

        return Promise.reject(fErr);
      });
  }
}
