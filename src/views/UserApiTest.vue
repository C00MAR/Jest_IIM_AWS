<template>
  <div class="user-api-test">
    <h1>Test des API Utilisateurs</h1>
    
    <!-- Section Créer un utilisateur -->
    <section>
      <h2>Créer un utilisateur</h2>
      <form @submit.prevent="createUser">
        <div>
          <label>User ID:</label>
          <input v-model="createForm.userId" type="text" required />
        </div>
        <div>
          <label>Nom:</label>
          <input v-model="createForm.name" type="text" required />
        </div>
        <div>
          <label>Email:</label>
          <input v-model="createForm.email" type="email" />
        </div>
        <div>
          <label>Âge:</label>
          <input v-model.number="createForm.age" type="number" />
        </div>
        <div>
          <label>Téléphone:</label>
          <input v-model="createForm.phone" type="text" />
        </div>
        <button type="submit" :disabled="loading">Créer</button>
      </form>
      <div v-if="createResult" class="result">
        <h3>Résultat:</h3>
        <pre>{{ JSON.stringify(createResult, null, 2) }}</pre>
      </div>
    </section>

    <hr />

    <!-- Section Récupérer un utilisateur -->
    <section>
      <h2>Récupérer un utilisateur</h2>
      <form @submit.prevent="getUser">
        <div>
          <label>User ID:</label>
          <input v-model="getUserId" type="text" required />
        </div>
        <button type="submit" :disabled="loading">Récupérer</button>
      </form>
      <div v-if="getResult" class="result">
        <h3>Résultat:</h3>
        <pre>{{ JSON.stringify(getResult, null, 2) }}</pre>
      </div>
    </section>

    <hr />

    <!-- Section Mettre à jour un utilisateur -->
    <section>
      <h2>Mettre à jour un utilisateur</h2>
      <form @submit.prevent="updateUser">
        <div>
          <label>User ID:</label>
          <input v-model="updateForm.userId" type="text" required />
        </div>
        <div>
          <label>Nouveau nom:</label>
          <input v-model="updateForm.name" type="text" />
        </div>
        <div>
          <label>Nouvel email:</label>
          <input v-model="updateForm.email" type="email" />
        </div>
        <div>
          <label>Nouvel âge:</label>
          <input v-model.number="updateForm.age" type="number" />
        </div>
        <button type="submit" :disabled="loading">Mettre à jour</button>
      </form>
      <div v-if="updateResult" class="result">
        <h3>Résultat:</h3>
        <pre>{{ JSON.stringify(updateResult, null, 2) }}</pre>
      </div>
    </section>

    <!-- Messages d'erreur -->
    <div v-if="error" class="error">
      <h3>Erreur:</h3>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserApiTest',
  data() {
    return {
      loading: false,
      error: null,
      apiBaseUrl: 'https://m4p4qzo7u6.execute-api.eu-west-1.amazonaws.com/dev',
      
      // Formulaire de création
      createForm: {
        userId: '',
        name: '',
        email: '',
        age: null,
        phone: ''
      },
      createResult: null,
      
      // Récupération
      getUserId: '',
      getResult: null,
      
      // Mise à jour
      updateForm: {
        userId: '',
        name: '',
        email: '',
        age: null
      },
      updateResult: null
    }
  },
  methods: {
    async createUser() {
      this.loading = true;
      this.error = null;
      this.createResult = null;
      
      try {
        const userData = {};
        if (this.createForm.name) userData.name = this.createForm.name;
        if (this.createForm.email) userData.email = this.createForm.email;
        if (this.createForm.age) userData.age = this.createForm.age;
        if (this.createForm.phone) userData.phone = this.createForm.phone;

        const response = await fetch(`${this.apiBaseUrl}/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'addUser',
            userId: this.createForm.userId,
            userData: userData
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          this.createResult = result;
        } else {
          this.error = result.error || 'Erreur lors de la création';
        }
      } catch (err) {
        this.error = `Erreur réseau: ${err.message}`;
      } finally {
        this.loading = false;
      }
    },

    async getUser() {
      this.loading = true;
      this.error = null;
      this.getResult = null;
      
      try {
        const response = await fetch(`${this.apiBaseUrl}/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'getUser',
            userId: this.getUserId
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          this.getResult = result;
        } else {
          this.error = result.error || 'Erreur lors de la récupération';
        }
      } catch (err) {
        this.error = `Erreur réseau: ${err.message}`;
      } finally {
        this.loading = false;
      }
    },

    async updateUser() {
      this.loading = true;
      this.error = null;
      this.updateResult = null;
      
      try {
        const userData = {};
        if (this.updateForm.name) userData.name = this.updateForm.name;
        if (this.updateForm.email) userData.email = this.updateForm.email;
        if (this.updateForm.age) userData.age = this.updateForm.age;

        const response = await fetch(`${this.apiBaseUrl}/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateUser',
            userId: this.updateForm.userId,
            userData: userData
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          this.updateResult = result;
        } else {
          this.error = result.error || 'Erreur lors de la mise à jour';
        }
      } catch (err) {
        this.error = `Erreur réseau: ${err.message}`;
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style scoped>
.user-api-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

section {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

form div {
  margin: 10px 0;
}

label {
  display: inline-block;
  width: 120px;
  font-weight: bold;
}

input {
  width: 200px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 3px;
}

.error {
  margin-top: 15px;
  padding: 10px;
  background: #f8d7da;
  border-radius: 3px;
  color: #721c24;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

hr {
  margin: 30px 0;
  border: none;
  border-top: 2px solid #eee;
}
</style>