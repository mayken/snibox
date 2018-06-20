import _ from 'lodash'
import axios from 'axios'
import Factory from '../mixins/factory'

const ERROR_MESSAGE_DURATION = 6000

class BackendService {
  constructor(component = null, options) {
    this.component = component
    this.options   = options
  }

  // create or update
  save(callback = null) {
    let error_message = this.options.messages.error
    axios[this.options.method](this.options.path, this.options.data)
      .then(
        response => {
          if (response.data.completed) {
            this.updateState(callback, response)
          }
          else {
            // render error notification from api
            if (response.data.hasOwnProperty('errors')) {
              error_message += '<br/><br/>'
              response.data.errors.forEach(error => {
                error_message = error_message + error + '.<br/>'
              })
            }
            this.component.$toasted.error(error_message, {duration: ERROR_MESSAGE_DURATION})
          }
        })
      .catch(error => {
        console.log(error)
        this.component.$toasted.error(error_message, {duration: ERROR_MESSAGE_DURATION})
      })
  }

  destroy(callback = null) {
    axios.delete(this.options.path)
      .then(response => {
        this.updateState(callback, response)
      })
      .catch(error => {
        console.log(error)
        this.component.$toasted.error(this.options.messages.error, {duration: ERROR_MESSAGE_DURATION})
      })
  }

  updateState(callback = null, data) {
    axios.get('/api/v1/data/default-state')
      .then(response => {
        this.component.$store.dispatch('setData', response.data)
        if (_.isFunction(callback)) {
          callback(data)
        }
        this.component.$store.dispatch('setDefaultActiveEntities')
        this.component.$toasted.success(this.options.messages.success)
      })
      .catch(error => {
        console.log(error)
        this.component.$toasted.error('Unable to update application state.', {duration: ERROR_MESSAGE_DURATION})
      })
  }
}

class SnippetService extends BackendService {
  save() {
    this.options.data = {
      snippet: {
        id: this.component.snippet.id,
        title: this.component.$store.state.labelSnippets.editTitle,
        content: this.component.editor.getValue(),
        language: this.component.snippet.language,
        tabs: this.component.snippet.tabs,
        label_attributes: {
          name: this.component.$store.state.labelSnippets.editLabelName
        }
      }
    }
    super.save(response => {
      this.component.$store.commit('setActiveLabelSnippet', response.data.entity)
    })
  }

  destroy() {
    super.destroy(response => {
      this.component.$store.commit('setActiveLabelSnippet', Factory.methods.factory().snippet)
    })
  }
}


class LabelService extends BackendService {
  save() {
    this.options.data = {
      label: {
        name: this.component.$store.state.labels.editName
      }
    }
    super.save(response => {
      this.component.$store.commit('setActiveLabel', response.data.entity)
      this.component.showLabelEdit = false
    })
  }
}


export default {
  snippet: {
    create(component) {
      let options = {
        path: '/api/v1/snippets',
        method: 'post',
        messages: {
          success: 'Snippet created!',
          error: 'Unable to create snippet.'
        }
      }
      new SnippetService(component, options).save()
    },

    update(component) {
      let options = {
        path: '/api/v1/snippets/:id'.replace(':id', component.snippet.id),
        method: 'patch',
        messages: {
          success: 'Snippet updated!',
          error: 'Unable to update snippet.'
        }
      }
      new SnippetService(component, options).save()
    },

    destroy(component) {
      let options = {
        path: '/api/v1/snippets/:id'.replace(':id', component.snippet.id),
        messages: {
          success: 'Snippet removed!',
          error: 'Unable to delete snippet.'
        }
      }

      new SnippetService(component, options).destroy()
    }
  },

  label: {
    update(component) {
      let options = {
        path: '/api/v1/labels/' + component.label.id,
        method: 'patch',
        messages: {
          success: 'Label updated!',
          error: 'Unable to update label.'
        }
      }
      new LabelService(component, options).save()
    }
  },

  data: {
    get(link, callback) {
      axios.get(link)
        .then(response => {
          if (_.isFunction(callback)) {
            callback(response)
          }
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}
